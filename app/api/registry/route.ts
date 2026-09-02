import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {readRegistry,seedRegistry,isRegistryOperator} from '@/db/registry-store';
import {type Studio,type Staff,type Claim,type StudioBooking,type RegistryIssue,registrySlotReason} from '@/lib/registry';
import {timestamp,localDate,addDays} from '@/lib/domain';
import {registrationAction} from '@/db/registrations';
import {memberForDate,sessionPrice,type StudioMember} from '@/lib/discovery';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class Fault extends Error{constructor(message:string,public status=400){super(message)}}
function fail(message:string,status=400):never{throw new Fault(message,status)}
const text=z.string().trim();const id=text.min(1).max(100);const https=z.union([z.literal(''),z.string().url().startsWith('https://').max(1000)]);
const roomSchema=z.object({id:id,name:text.min(2).max(100),price:z.number().int().min(100).max(100000),capacity:z.number().int().min(1).max(200),open:z.number().int().min(0).max(1410).multipleOf(30),close:z.number().int().min(30).max(1440).multipleOf(30),days:z.array(z.number().int().min(0).max(6)).min(1).max(7),buffer:z.number().int().min(0).max(120).multipleOf(30),minimum:z.number().int().min(30).max(480).multipleOf(30)}).refine(r=>r.close-r.open>=r.minimum+r.buffer,'Hours must accommodate the minimum session and buffer');
export async function GET(req:Request){try{const user=await getChatGPTUser();return response(await readRegistry(user,new URL(req.url).searchParams.get('studio')||undefined));}catch(e){console.error('Registry load failed',e instanceof Error?e.message:'Unknown error');return response({error:'The studio registry is temporarily unavailable. Please retry.'},503)}}
export async function POST(req:Request){
 try{
 const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)fail('Cross-origin request rejected',403);
 const user=await getChatGPTUser();if(!user)fail('Sign in with ChatGPT to continue',401);const email=user.email.toLowerCase();
 if(Number(req.headers.get('content-length')||0)>40000)fail('Request too large',413);
 const rawText=await req.text();if(rawText.length>40000)fail('Request too large',413);let p:any;try{p=JSON.parse(rawText)}catch{fail('Invalid JSON')};
 z.object({type:text.min(1).max(40)}).parse(p);await seedRegistry();const db=database();const operator=isRegistryOperator(email);const now=new Date().toISOString();
 const registration=await registrationAction(p,email,operator);if(registration)return registration;
 const audit=(studioId:string,event:string)=>db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),studioId,email,event,now);
 if(p.type==='addStudio'){
 if(!operator)fail('Registry operator access required',403);const v=z.object({name:text.min(3).max(120),area:text.min(2).max(80),address:text.min(5).max(300),description:text.min(30).max(2000),category:z.enum(['Rehearsal studio','Recording studio','Music institution','Production facility']),source:z.string().url().startsWith('https://').max(1000),sourceTitle:text.min(3).max(120)}).parse(p);
 const newId='studio-'+crypto.randomUUID();const s:Studio={id:newId,name:v.name,area:v.area,address:v.address,description:v.description,category:v.category,services:[v.category==='Rehearsal studio'?'Rehearsal':'Recording'],website:'',phone:'',email:'',sources:[{title:v.sourceTitle,url:v.source,checked:now.slice(0,10),kind:'Public directory',note:'Added after operator review'}],status:'unclaimed',bookingEnabled:false,rooms:[],equipment:'',rules:'',location:null,revision:0};
 const duplicate=await db.prepare("SELECT id FROM studio_registry WHERE lower(json_extract(content,'$.name'))=lower(?)").bind(v.name).first();if(duplicate)fail('A studio with this name already exists',409);
 await db.batch([db.prepare('INSERT INTO studio_registry(id,content) VALUES(?,?)').bind(newId,JSON.stringify(s)),audit(newId,'add sourced studio')]);return response({ok:true,studio:s});
 }
 if(p.type==='issue'){
 const v=z.object({studioId:text.max(100),kind:z.enum(['correction','suggestion','removal']),text:text.min(15).max(2000),source:https}).parse(p);
 const count=await db.prepare("SELECT count(*) n FROM studio_issues WHERE reporter=? AND json_extract(content,'$.status')='open'").bind(email).first();if(count.n>=20)fail('Please wait for your existing suggestions to be reviewed.',429);
 const issue:RegistryIssue={...v,id:crypto.randomUUID(),status:'open',createdAt:now,reporter:email};await db.prepare('INSERT INTO studio_issues(id,reporter,content) VALUES(?,?,?)').bind(issue.id,email,JSON.stringify(issue)).run();return response({ok:true});
 }
 if(p.type==='resolveIssue'){
 if(!operator)fail('Registry operator access required',403);const v=z.object({id}).parse(p);const row=await db.prepare('SELECT content FROM studio_issues WHERE id=?').bind(v.id).first();if(!row)fail('Issue not found',404);const issue=JSON.parse(row.content);issue.status='resolved';await db.batch([db.prepare('UPDATE studio_issues SET content=? WHERE id=?').bind(JSON.stringify(issue),v.id),audit(issue.studioId,'resolve registry issue')]);return response({ok:true});
 }
 const studioId=id.parse(p.studioId);const row=await db.prepare('SELECT * FROM studio_registry WHERE id=?').bind(studioId).first();if(!row)fail('Studio not found',404);const studio:Studio={...JSON.parse(row.content),revision:row.revision};
 const owner=row.owner===email;const membership=await db.prepare("SELECT * FROM studio_staff WHERE studio_id=? AND email=? AND status='active'").bind(studioId,email).first();const manager=owner||membership?.role==='manager';
 const statements:any[]=[];let result:unknown={ok:true};
 const own=()=>{if(!owner)fail('Only the verified studio owner can do this',403)};const manage=()=>{if(!manager)fail('Studio manager access required',403)};
 const bookingRow=async()=>{const r=await db.prepare('SELECT content FROM studio_bookings WHERE id=? AND studio_id=?').bind(id.parse(p.id),studioId).first();if(!r)fail('Booking not found',404);return JSON.parse(r.content) as StudioBooking};
 if(p.type==='claim'){
 if(studio.hidden||row.owner)fail('This profile cannot be claimed. Use Report a problem for ownership disputes.',409);
 const v=z.object({name:text.min(2).max(120),role:text.min(2).max(120),phone:text.min(7).max(40),evidence:text.min(30).max(2000),authorized:z.literal(true)}).parse(p);
 const existing=await db.prepare('SELECT * FROM studio_claim_requests WHERE studio_id=? AND applicant=?').bind(studioId,email).first();if(existing?.status==='pending')fail('You already have a pending claim for this studio',409);
 const n=await db.prepare("SELECT count(*) n FROM studio_claim_requests WHERE applicant=? AND status='pending'").bind(email).first();if(n.n>=5)fail('Please wait for your pending claims to be reviewed.',429);
 const claim:Claim={id:existing?.id||crypto.randomUUID(),studioId,applicant:email,name:v.name,role:v.role,phone:v.phone,evidence:v.evidence,code:'SESSIONS-'+crypto.randomUUID().slice(0,8).toUpperCase(),status:'pending',createdAt:now};
 statements.push(db.prepare('INSERT INTO studio_claim_requests(id,studio_id,applicant,status,content) VALUES(?,?,?,?,?) ON CONFLICT(studio_id,applicant) DO UPDATE SET status=excluded.status,content=excluded.content').bind(claim.id,studioId,email,'pending',JSON.stringify(claim)));result={ok:true,claim};
 }else if(p.type==='reviewClaim'){
 if(!operator)fail('Registry operator access required',403);
 const v=z.object({id,decision:z.enum(['approved','rejected']),note:text.min(20).max(2000),independentContact:z.literal(true),authorityChecked:z.literal(true)}).parse(p);
 const r=await db.prepare('SELECT * FROM studio_claim_requests WHERE id=? AND studio_id=?').bind(v.id,studioId).first();if(!r||r.status!=='pending')fail('This claim is no longer pending',409);const claim:Claim=JSON.parse(r.content);if(claim.applicant===email)fail('You cannot review your own ownership claim',403);if(row.owner&&v.decision==='approved')fail('This studio already has an owner',409);
 Object.assign(claim,{status:v.decision,note:v.note,reviewedBy:email,reviewedAt:now});statements.push(db.prepare('UPDATE studio_claim_requests SET status=?,content=? WHERE id=?').bind(v.decision,JSON.stringify(claim),claim.id));
 if(v.decision==='approved'){studio.status='claimed';studio.verifiedAt=now;statements.push(db.prepare('UPDATE studio_registry SET owner=? WHERE id=? AND owner IS NULL').bind(claim.applicant,studioId));const competing=(await db.prepare("SELECT * FROM studio_claim_requests WHERE studio_id=? AND id!=? AND status='pending'").bind(studioId,claim.id).all()).results;for(const c of competing){const value=JSON.parse(c.content);Object.assign(value,{status:'rejected',note:'Another ownership claim was approved. Use the correction form to dispute ownership.',reviewedAt:now});statements.push(db.prepare('UPDATE studio_claim_requests SET status=?,content=? WHERE id=?').bind('rejected',JSON.stringify(value),c.id));}}
 }else if(p.type==='profile'){
 own();const v=z.object({description:text.min(30).max(2000),address:text.min(10).max(300),area:text.min(2).max(80),website:https,phone:text.min(7).max(40),email:z.union([z.literal(''),z.string().email().max(200)]),equipment:text.max(2000),rules:text.max(2000),services:z.array(text.min(2).max(50)).min(1).max(12),location:z.object({lat:z.number().min(-18.2).max(-17.4),lng:z.number().min(30.6).max(31.5)}).nullable(),rooms:z.array(roomSchema).max(12),bookingEnabled:z.boolean()}).parse(p);
 if(new Set(v.rooms.map(r=>r.id)).size!==v.rooms.length)fail('Each room must have a unique ID');if(v.bookingEnabled&&(!v.rooms.length||!v.location||v.rules.length<20))fail('Add a room, confirmed map pin and booking rules before enabling requests');
 const future=(await db.prepare('SELECT content FROM studio_bookings WHERE studio_id=?').bind(studioId).all()).results.map((r:any)=>JSON.parse(r.content) as StudioBooking).filter((b:StudioBooking)=>['requested','confirmed'].includes(b.status));
 if(future.length&&JSON.stringify(v.rooms)!==JSON.stringify(studio.rooms))fail('Resolve existing requests and bookings before changing room schedules or rates. Contact details can still be edited.',409);
 Object.assign(studio,v,{updatedAt:now});
 }else if(p.type==='memberPlans'){
 own();const v=z.object({plans:z.array(z.object({id:id,name:text.min(2).max(80),fee:z.number().int().min(0).max(100000),termDays:z.number().int().min(1).max(366),discountPercent:z.number().int().min(0).max(50),priority:z.boolean(),benefits:text.min(10).max(600),active:z.boolean()})).max(5)}).parse(p);
 if(new Set(v.plans.map(x=>x.id)).size!==v.plans.length)fail('Each membership plan needs a unique ID');studio.memberPlans=v.plans;studio.updatedAt=now;
 }else if(p.type==='joinMembership'){
 const v=z.object({planId:id,name:text.min(2).max(120),consent:z.literal(true)}).parse(p);if(studio.hidden||!row.owner)fail('Memberships require a claimed studio',409);
 const plan=studio.memberPlans?.find(x=>x.id===v.planId&&x.active);if(!plan)fail('This membership plan is not available',409);
 const old=await db.prepare('SELECT content FROM studio_members WHERE studio_id=? AND customer=?').bind(studioId,email).first();const existing:StudioMember|undefined=old?JSON.parse(old.content):undefined;
 if(existing&&(existing.status==='requested'||existing.status==='active'&&!!existing.expiresOn&&existing.expiresOn>=localDate()))fail('You already have an active or pending membership here',409);
 const member:StudioMember={id:existing?.id||crypto.randomUUID(),studioId,customer:email,name:v.name,plan,status:'requested',createdAt:now};
 statements.push(db.prepare('INSERT INTO studio_members(id,studio_id,customer,content) VALUES(?,?,?,?) ON CONFLICT(studio_id,customer) DO UPDATE SET content=excluded.content').bind(member.id,studioId,email,JSON.stringify(member)));result={ok:true,membership:member};
 }else if(p.type==='reviewMembership'){
 own();const v=z.object({id,decision:z.enum(['active','declined']),note:text.min(10).max(500),paymentConfirmed:z.boolean()}).parse(p);
 const r=await db.prepare('SELECT content FROM studio_members WHERE id=? AND studio_id=?').bind(v.id,studioId).first();if(!r)fail('Membership not found',404);const member:StudioMember=JSON.parse(r.content);if(member.status!=='requested')fail('This request was already reviewed',409);
 if(v.decision==='active'&&member.plan.fee>0&&!v.paymentConfirmed)fail('Confirm the agreed fee was collected outside Sessions before activating');
 member.status=v.decision;member.note=v.note;if(v.decision==='active'){member.startsOn=localDate();member.expiresOn=addDays(member.startsOn,member.plan.termDays-1);}
 statements.push(db.prepare('UPDATE studio_members SET content=? WHERE id=?').bind(JSON.stringify(member),v.id));result={ok:true,membership:member};
 }else if(p.type==='cancelMembership'){
 const v=z.object({id,consent:z.literal(true)}).parse(p);const r=await db.prepare('SELECT content FROM studio_members WHERE id=? AND studio_id=?').bind(v.id,studioId).first();if(!r)fail('Membership not found',404);const member:StudioMember=JSON.parse(r.content);if(!owner&&member.customer!==email)fail('Membership belongs to another account',403);
 member.status='cancelled';member.note='Membership ended. Existing booking prices remain unchanged. Settle any externally paid fee directly with the studio.';
 statements.push(db.prepare('UPDATE studio_members SET content=? WHERE id=?').bind(JSON.stringify(member),v.id));
 }else if(p.type==='inviteStaff'){
 own();const v=z.object({email:z.string().email().max(200),role:z.enum(['manager','staff']),title:text.min(2).max(100)}).parse(p);v.email=v.email.toLowerCase();
 const count=await db.prepare('SELECT count(*) n FROM studio_staff WHERE studio_id=?').bind(studioId).first();if(count.n>=50)fail('Team limit reached',429);
 const staff:Staff={id:crypto.randomUUID(),studioId,email:v.email,role:v.role,title:v.title,name:'',bio:'',skills:'',status:'invited',public:false};statements.push(db.prepare('INSERT INTO studio_staff(id,studio_id,email,status,role,content) VALUES(?,?,?,?,?,?)').bind(staff.id,studioId,v.email,'invited',v.role,JSON.stringify(staff)));result={ok:true,staff};
 }else if(p.type==='staffProfile'){
 const v=z.object({id,name:text.min(2).max(120),title:text.min(2).max(100),bio:text.max(1000),skills:text.max(300),public:z.boolean(),consent:z.literal(true)}).parse(p);
 const r=await db.prepare('SELECT * FROM studio_staff WHERE id=? AND studio_id=? AND email=?').bind(v.id,studioId,email).first();if(!r)fail('This invitation belongs to another account',403);
 const staff:Staff={...JSON.parse(r.content),name:v.name,title:v.title,bio:v.bio,skills:v.skills,public:v.public,status:'active',joinedAt:now};statements.push(db.prepare("UPDATE studio_staff SET status='active',content=? WHERE id=?").bind(JSON.stringify(staff),v.id));
 }else if(p.type==='removeStaff'){
 const v=z.object({id}).parse(p);const r=await db.prepare('SELECT * FROM studio_staff WHERE id=? AND studio_id=?').bind(v.id,studioId).first();if(!r)fail('Team member not found',404);if(!owner&&r.email!==email)fail('Only the owner or team member can remove this membership',403);
 const assigned=(await db.prepare('SELECT content FROM studio_bookings WHERE studio_id=?').bind(studioId).all()).results.map((b:any)=>JSON.parse(b.content));for(const b of assigned.filter((b:any)=>b.staffId===v.id)){b.staffId='';statements.push(db.prepare('UPDATE studio_bookings SET content=? WHERE id=?').bind(JSON.stringify(b),b.id));}statements.push(db.prepare('DELETE FROM studio_staff WHERE id=?').bind(v.id));
 }else if(p.type==='book'){
 const v=z.object({key:z.string().uuid(),roomId:id,date:text.regex(/^\d{4}-\d{2}-\d{2}$/),start:z.number().int(),duration:z.number().int().min(30).max(480),size:z.number().int().min(1).max(200),name:text.min(2).max(120),phone:text.min(7).max(40),note:text.max(1000),terms:z.literal(true)}).parse(p);
 const existing=await db.prepare('SELECT content FROM studio_bookings WHERE customer=? AND request_key=?').bind(email,v.key).first();if(existing)return response({ok:true,booking:JSON.parse(existing.content)});
 if(studio.status!=='claimed'||!row.owner||!studio.bookingEnabled||studio.hidden)fail('This studio is not accepting Sessions booking requests',409);
 const room=studio.rooms.find(r=>r.id===v.roomId);if(!room)fail('Room not found',404);if(v.size>room.capacity)fail('Your group exceeds the room capacity');
 const all=(await db.prepare('SELECT content FROM studio_bookings WHERE studio_id=?').bind(studioId).all()).results.map((r:any)=>JSON.parse(r.content));if(all.filter((b:StudioBooking)=>b.customer===email&&b.status==='requested').length>=10)fail('Please wait for your current requests to be reviewed.',429);const reason=registrySlotReason(studio,room,v.date,v.start,v.duration,all);if(reason)fail(reason,409);
 const members=(await db.prepare('SELECT content FROM studio_members WHERE studio_id=? AND customer=?').bind(studioId,email).all()).results.map((m:any)=>JSON.parse(m.content));
 const calculated=sessionPrice(room.price,v.duration,memberForDate(members,studioId,v.date));
 const booking:StudioBooking={id:'RS-'+crypto.randomUUID(),studioId,roomId:room.id,roomName:room.name,customer:email,name:v.name,phone:v.phone,date:v.date,start:v.start,duration:v.duration,size:v.size,note:v.note,staffId:'',status:'requested',...calculated,createdAt:now};
 statements.push(db.prepare('INSERT INTO studio_bookings(id,studio_id,customer,request_key,content) VALUES(?,?,?,?,?)').bind(booking.id,studioId,email,v.key,JSON.stringify(booking)));for(let m=v.start;m<v.start+v.duration+room.buffer;m+=30)statements.push(db.prepare('INSERT INTO studio_booking_slots(studio_id,room_id,date,minute,booking_id) VALUES(?,?,?,?,?)').bind(studioId,room.id,v.date,m,booking.id));result={ok:true,booking};
 }else if(p.type==='bookingStatus'){
 const v=z.object({id,status:z.enum(['confirmed','declined','cancelled','completed']),staffId:text.max(100).optional()}).parse(p);const b=await bookingRow();
 if(v.status==='cancelled'){if(b.customer!==email&&!manager)fail('This booking belongs to another account',403);if(!['requested','confirmed'].includes(b.status))fail('This booking cannot be cancelled',409)}else{manage();if(v.status==='completed'){if(b.status!=='confirmed'||timestamp(b.date,b.start+b.duration)>Date.now())fail('Only a finished confirmed session can be completed',409)}else if(b.status!=='requested')fail('Only a pending request can be accepted or declined',409)}
 if(v.staffId){manage();const staff=await db.prepare("SELECT * FROM studio_staff WHERE id=? AND studio_id=? AND status='active'").bind(v.staffId,studioId).first();if(!staff)fail('Select an active member of this studio');b.staffId=v.staffId;}
 b.status=v.status;statements.push(db.prepare('UPDATE studio_bookings SET content=? WHERE id=?').bind(JSON.stringify(b),b.id));if(['cancelled','declined'].includes(v.status))statements.push(db.prepare('DELETE FROM studio_booking_slots WHERE booking_id=?').bind(b.id));result={ok:true,booking:b};
 }else if(p.type==='correctStudio'){
 if(!operator)fail('Registry operator access required',403);const v=z.object({name:text.min(3).max(120),area:text.min(2).max(80),address:text.min(5).max(300),notice:text.min(20).max(500),source:z.string().url().startsWith('https://').max(1000),sourceTitle:text.min(3).max(120)}).parse(p);
 const addressChanged=studio.address!==v.address;Object.assign(studio,{name:v.name,area:v.area,address:v.address,notice:v.notice,updatedAt:now});if(addressChanged){studio.location=null;studio.bookingEnabled=false;}studio.sources=[...studio.sources.slice(-19),{title:v.sourceTitle,url:v.source,checked:now.slice(0,10),kind:'Public directory',note:'Operator correction'}];
 }else if(p.type==='visibility'){
 if(!operator)fail('Registry operator access required',403);const v=z.object({hidden:z.boolean(),note:text.min(20).max(500)}).parse(p);studio.hidden=v.hidden;studio.notice=v.note;if(v.hidden)studio.bookingEnabled=false;
 }else fail('Unknown action');
 const guard=crypto.randomUUID();const check=db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN revision=? THEN 1 ELSE 0 END FROM studio_registry WHERE id=?))').bind(guard,row.revision,studioId);
 await db.batch([check,...statements,db.prepare('UPDATE studio_registry SET content=?,revision=revision+1 WHERE id=?').bind(JSON.stringify(studio),studioId),audit(studioId,p.type),db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard)]);
 return response(result);
 }catch(e){if(e instanceof Fault)return response({error:e.message},e.status);if(e instanceof z.ZodError)return response({error:e.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},400);if(e instanceof Error&&/UNIQUE|CHECK|constraint/i.test(e.message))return response({error:'This record changed or already exists. Refresh and try again.'},409);console.error('Registry operation failed',e instanceof Error?e.message:'Unknown error');return response({error:'Unable to save this change. Please retry.'},503)}
}
