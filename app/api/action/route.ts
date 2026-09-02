import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database,readState} from '@/db/store';
import {slotReason,quote,refundable,addDays,timestamp,EQUIPMENT,AREAS,type Booking,type Room,type Block} from '@/lib/domain';
import {demoPayments} from '@/lib/services';
import {z} from 'zod';
const text=z.string().trim().min(1).max(200);
const identifier=z.string().min(1).max(100);
const roomSchema=z.object({id:identifier,name:text,venue:text,category:z.enum(['Studio','Church','School','University','Arts centre','Institution','Private approved facility']),area:z.enum(AREAS as [string,...string[]]),description:z.string().min(15).max(3000),price:z.number().int().min(100).max(100000),capacity:z.number().int().min(1).max(200),equipment:z.array(z.enum(EQUIPMENT)).max(9),backup:z.boolean(),parking:z.boolean(),accessible:z.boolean(),instant:z.boolean(),active:z.boolean(),image:z.string().regex(/^\/(images\/(studio|hall|intimate)\.webp|api\/media\/[a-zA-Z0-9-]+)$/),minimum:z.number().int().min(30).max(480).multipleOf(30),deposit:z.number().int().min(0).max(100000),buffer:z.number().int().min(0).max(120).multipleOf(30),cancellation:z.union([z.literal(24),z.literal(48)]),hours:z.record(z.tuple([z.number().int().min(0).max(1440).multipleOf(30),z.number().int().min(0).max(1440).multipleOf(30)]).nullable()),rules:z.string().min(5).max(3000),address:text,contact:z.string().max(200),checkin:z.string().max(1000),restricted:z.string().max(1000)});
function fail(message:string,status=400){return Response.json({error:message},{status})}
export async function POST(request:Request){
 try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return fail('Cross-origin request rejected',403);
 const user=await getChatGPTUser();if(!user)return fail('Sign in with ChatGPT to save your demo workspace.',401);
 const length=Number(request.headers.get('content-length')||0);if(length>30000)return fail('Request too large',413);
 const body=await request.json();const state:any=await readState(user.email);const db=database();const owner=user.email;const statements:any[]=[];let result:any={};
 if(body.type==='book'){
 const input=z.object({roomId:identifier,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),start:z.number(),duration:z.number(),weeks:z.number().int().min(1).max(4),groupName:text,groupSize:z.number().int().min(1).max(200),key:z.string().uuid(),simulateFailure:z.boolean().optional()}).parse(body);
 const old=await db.prepare('SELECT content FROM bookings WHERE owner=? AND request_key=?').bind(owner,input.key+'-0').first();if(old)return Response.json({booking:JSON.parse(old.content),reused:true});
 const room=state.rooms.find((r:Room)=>r.id===input.roomId);if(!room)return fail('Room not found',404);if(input.groupSize>room.capacity)return fail('Your group exceeds the room capacity');
 if(!Number.isFinite(timestamp(input.date,0))||new Date(input.date+'T12:00:00Z').toISOString().slice(0,10)!==input.date)return fail('Invalid booking date');
 const total=quote(room,input.duration,state.feeBps);
 const dates=Array.from({length:input.weeks},(_,i)=>addDays(input.date,i*7));for(const date of dates){const reason=slotReason(room,date,input.start,input.duration,state.bookings,state.blocks);if(reason)return fail(`${date}: ${reason}`,409)}
 const payment=await demoPayments.charge({amount:total.total*input.weeks,currency:'USD',approvalRequired:!room.instant,simulateFailure:input.simulateFailure});
 const added:Booking[]=dates.map((date,i)=>({id:'SS-'+crypto.randomUUID().slice(0,8).toUpperCase(),roomId:room.id,roomName:room.name,venue:room.venue,area:room.area,image:room.image,date,start:input.start,duration:input.duration,status:room.instant?'confirmed':'pending_approval',payment:payment.state,...total,refund:0,currency:'USD',groupName:input.groupName,groupSize:input.groupSize,createdAt:new Date().toISOString(),address:room.address,checkin:room.checkin,cancellation:room.cancellation}));
 for(let i=0;i<added.length;i++){const b=added[i];statements.push(db.prepare('INSERT INTO bookings(owner,id,request_key,content) VALUES(?,?,?,?)').bind(owner,b.id,input.key+'-'+i,JSON.stringify(b)));for(let m=b.start;m<b.start+b.duration+room.buffer;m+=30)statements.push(db.prepare('INSERT INTO slot_claims(owner,room_id,date,minute,booking_id) VALUES(?,?,?,?,?)').bind(owner,room.id,b.date,m,b.id));}
 result={booking:added[0],bookings:added};
 }else if(['cancel','approve','decline','complete','review','moderateReview'].includes(body.type)){
 const id=identifier.parse(body.id);const booking:Booking|undefined=state.bookings.find((b:Booking)=>b.id===id);if(!booking)return fail('Booking not found',404);
 if(body.type==='cancel'||body.type==='decline'){
 if(!['confirmed','pending_approval'].includes(booking.status))return fail('Only upcoming reservations can be cancelled');
 if(body.type==='decline'&&booking.status!=='pending_approval')return fail('Only pending requests can be declined');
 if(body.type==='cancel'&&timestamp(booking.date,booking.start)<=Date.now())return fail('This session has started. Use the incident pathway for help.');
 const wasPending=booking.status==='pending_approval';booking.refund=body.type==='decline'?booking.total:refundable(booking);booking.payment=wasPending?'void':booking.refund===booking.total?'refunded':'partially_refunded';booking.status='cancelled';statements.push(db.prepare('DELETE FROM slot_claims WHERE owner=? AND booking_id=?').bind(owner,id));
 }else if(body.type==='approve'){
 if(booking.status!=='pending_approval')return fail('Only pending requests can be approved');if(timestamp(booking.date,booking.start)<=Date.now())return fail('The requested time has passed. Decline this request.');booking.status='confirmed';booking.payment='paid';
 }else if(body.type==='complete'){
 if(booking.status!=='confirmed')return fail('Only confirmed sessions can be completed');booking.status='completed';booking.simulatedCompletion=timestamp(booking.date,booking.start+booking.duration)>Date.now();
 }else if(body.type==='review'){
 if(booking.status!=='completed')return fail('Only completed sessions can be reviewed');if(booking.review)return fail('This session already has a review');booking.review=z.object({rating:z.number().int().min(1).max(5),text:z.string().trim().min(5).max(1000)}).parse(body.review);
 }else if(booking.review){booking.review.hidden=!booking.review.hidden;}
 statements.push(db.prepare('UPDATE bookings SET content=? WHERE owner=? AND id=?').bind(JSON.stringify(booking),owner,id));result={booking};
 }else if(body.type==='favorite'){
 const id=identifier.parse(body.id);if(!state.rooms.some((r:Room)=>r.id===id))return fail('Room not found',404);state.favorites=state.favorites.includes(id)?state.favorites.filter((x:string)=>x!==id):[...state.favorites,id];
 }else if(body.type==='profile'){
 state.profile=z.object({name:z.string().trim().min(1).max(120),phone:z.string().max(30),intent:z.enum(['musician','provider']),organisation:z.string().max(200),contact:z.string().max(200),payout:z.string().max(300)}).parse(body.profile);
 }else if(body.type==='fee'){
 state.feeBps=z.number().int().min(0).max(3000).parse(body.feeBps);
 }else if(body.type==='room'){
 const parsed=roomSchema.parse(body.room);if(parsed.image.startsWith('/api/media/')){const upload=await db.prepare('SELECT id FROM uploads WHERE id=? AND owner=?').bind(parsed.image.split('/').pop(),owner).first();if(!upload)return fail('That uploaded image does not belong to this workspace',403);}for(const [day,hours]of Object.entries(parsed.hours)){if(!/^[0-6]$/.test(day)||hours&&(hours[1]<=hours[0]||hours[1]-hours[0]<parsed.minimum+parsed.buffer))return fail('Every open day must fit a session and its buffer');}
 const existing=state.rooms.find((r:Room)=>r.id===parsed.id);const room:Room={...parsed,verified:existing?.verified||false,verification:existing?.verification||'Not reviewed'};
 if(existing&&JSON.stringify([existing.hours,existing.buffer,existing.minimum])!==JSON.stringify([room.hours,room.buffer,room.minimum])){for(const b of state.bookings.filter((b:Booking)=>b.roomId===room.id&&['confirmed','pending_approval'].includes(b.status)&&timestamp(b.date,b.start)>Date.now())){if(slotReason(room,b.date,b.start,b.duration,state.bookings.filter((x:Booking)=>x.id!==b.id),state.blocks))return fail('These hours or buffers conflict with an existing reservation. Manage that reservation first.',409)}
 statements.push(db.prepare('DELETE FROM slot_claims WHERE owner=? AND room_id=? AND booking_id NOT LIKE ?').bind(owner,room.id,'block-%'));for(const b of state.bookings.filter((b:Booking)=>b.roomId===room.id&&b.status!=='cancelled'))for(let m=b.start;m<b.start+b.duration+room.buffer;m+=30)statements.push(db.prepare('INSERT INTO slot_claims(owner,room_id,date,minute,booking_id) VALUES(?,?,?,?,?)').bind(owner,room.id,b.date,m,b.id));}
 statements.push(db.prepare('INSERT INTO rooms(owner,id,content) VALUES(?,?,?) ON CONFLICT(owner,id) DO UPDATE SET content=excluded.content').bind(owner,room.id,JSON.stringify(room)));result={room};
 }else if(body.type==='verify'||body.type==='suspend'){
 const id=identifier.parse(body.id);const room:Room=state.rooms.find((r:Room)=>r.id===id);if(!room)return fail('Room not found',404);if(body.type==='verify'){room.verified=!room.verified;room.verification=room.verified?'Demo checked':'Not reviewed';}else room.active=!room.active;
 statements.push(db.prepare('UPDATE rooms SET content=? WHERE owner=? AND id=?').bind(JSON.stringify(room),owner,id));
 }else if(body.type==='block'){
 const block=z.object({roomId:identifier,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),start:z.number().int().min(0).max(1410).multipleOf(30),end:z.number().int().min(30).max(1440).multipleOf(30),reason:text}).parse(body.block);if(block.end<=block.start)return fail('Block end must be after start');if(!state.rooms.some((r:Room)=>r.id===block.roomId))return fail('Room not found');
 if(!Number.isFinite(timestamp(block.date,0))||new Date(block.date+'T12:00:00Z').toISOString().slice(0,10)!==block.date)return fail('Invalid block date');
 const id='block-'+crypto.randomUUID();const stored:Block={...block,id};statements.push(db.prepare('INSERT INTO blocks(owner,id,content) VALUES(?,?,?)').bind(owner,id,JSON.stringify(stored)));for(let m=block.start;m<block.end;m+=30)statements.push(db.prepare('INSERT INTO slot_claims(owner,room_id,date,minute,booking_id) VALUES(?,?,?,?,?)').bind(owner,block.roomId,block.date,m,id));
 }else if(body.type==='unblock'){
 const id=identifier.parse(body.id);statements.push(db.prepare('DELETE FROM blocks WHERE owner=? AND id=?').bind(owner,id),db.prepare('DELETE FROM slot_claims WHERE owner=? AND booking_id=?').bind(owner,id));
 }else if(body.type==='report'){
 const bookingId=identifier.parse(body.bookingId);if(!state.bookings.some((b:Booking)=>b.id===bookingId))return fail('Booking not found');state.reports.push({id:crypto.randomUUID(),bookingId,reason:z.string().trim().min(10).max(2000).parse(body.reason),status:'open',createdAt:new Date().toISOString()});
 }else if(body.type==='resolve'){
 const report=state.reports.find((r:any)=>r.id===body.id);if(!report)return fail('Report not found',404);report.status='resolved';
 }else return fail('Unknown operation');
 const revision=state.revision||0;const opId=crypto.randomUUID();
 const workspace={feeBps:state.feeBps,profile:state.profile,favorites:state.favorites,reports:state.reports,revision:revision+1};
 const guard=db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN COALESCE(json_extract(content,\'$.revision\'),0)=? THEN 1 ELSE 0 END FROM workspaces WHERE owner=?))').bind(opId,revision,owner);
 await db.batch([guard,...statements,db.prepare('UPDATE workspaces SET content=? WHERE owner=?').bind(JSON.stringify(workspace),owner),db.prepare('DELETE FROM operation_guards WHERE id=?').bind(opId)]);
 return Response.json(result);
 }catch(error){if(error instanceof z.ZodError)return fail(error.issues[0]?.message||'Invalid details');const msg=error instanceof Error?error.message:'';if(/constraint|UNIQUE|CHECK/.test(msg))return fail('Availability or workspace data changed. Refresh and choose again. Nothing was partially saved.',409);if(msg.startsWith('Demo payment declined'))return fail(msg,402);return fail('Unable to save this change. Please refresh and retry.',503)}
}
