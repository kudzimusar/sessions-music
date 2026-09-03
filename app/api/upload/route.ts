import {env} from 'cloudflare:workers';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {bookingAccess} from '@/lib/booking-access';

const imageTypes=['image/jpeg','image/png','image/webp'];
const validId=(value:string)=>/^[a-zA-Z0-9-]{1,100}$/.test(value);

export async function POST(request:Request){
 let objectId='';
 try{
  const user=await getProductionUser();
  if(!user)return Response.json({error:'Sign in first'},{status:401});
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origin rejected'},{status:403});
  const form=await request.formData();
  const file=form.get('file');
  const purpose=String(form.get('purpose')||'');
  const studioId=String(form.get('studioId')||'');
  const roomId=String(form.get('roomId')||'');
  const bookingId=String(form.get('bookingId')||'');
  if(!(file instanceof File)||file.size>5*1024*1024||!imageTypes.includes(file.type))return Response.json({error:'Use a JPEG, PNG or WebP image up to 5 MB.'},{status:400});
  if(purpose&&!['studio_room_photo','studio_verification','settlement_proof','booking_message_attachment'].includes(purpose))return Response.json({error:'Unsupported upload purpose'},{status:400});
  const db=database();
  if(purpose){
   if(!validId(studioId)||purpose==='studio_room_photo'&&!validId(roomId))return Response.json({error:'Choose a valid studio and room'},{status:400});
   if(purpose==='settlement_proof'){
    if(!validId(bookingId))return Response.json({error:'Choose a valid booking'},{status:400});const booking=await db.prepare('SELECT customer,content FROM studio_bookings WHERE id=? AND studio_id=?').bind(bookingId,studioId).first();if(!booking||booking.customer!==user.id)return Response.json({error:'This booking belongs to another account'},{status:403});const value=JSON.parse(booking.content);if(value.status!=='confirmed')return Response.json({error:'Only a confirmed booking can receive payment proof'},{status:409});const settlement=await db.prepare('SELECT status FROM studio_settlements WHERE booking_id=?').bind(bookingId).first();if(!settlement||!['awaiting_payment','payment_declined'].includes(settlement.status))return Response.json({error:'Payment proof cannot be added in this state'},{status:409});const total=await db.prepare("SELECT count(*) n FROM uploads WHERE owner=? AND booking_id=? AND purpose='settlement_proof'").bind(user.id,bookingId).first();if(Number(total?.n||0)>=10)return Response.json({error:'Payment proof upload limit reached'},{status:429});
   }else if(purpose==='booking_message_attachment'){
    if(!validId(bookingId))return Response.json({error:'Choose a valid booking'},{status:400});const access=await bookingAccess(user,bookingId,studioId);if(!access||access.role==='operations')return Response.json({error:'This booking belongs to another account'},{status:403});if(!['requested','confirmed','completed'].includes(access.booking.status))return Response.json({error:'This booking conversation is closed'},{status:409});const total=await db.prepare("SELECT count(*) n FROM uploads WHERE owner=? AND booking_id=? AND purpose='booking_message_attachment'").bind(user.id,bookingId).first();if(Number(total?.n||0)>=10)return Response.json({error:'Booking message image limit reached'},{status:429});
   }else{
    const studio=await db.prepare('SELECT owner FROM studio_registry WHERE id=?').bind(studioId).first();const membership=user.memberships.find(value=>value.organizationId===studioId&&value.active);const owner=studio?.owner===user.id&&(user.method==='chatgpt_demo'||membership?.role==='owner');if(!owner)return Response.json({error:'Only this studio owner can upload media'},{status:403});const total=await db.prepare('SELECT count(*) n FROM uploads WHERE owner=? AND studio_id=?').bind(user.id,studioId).first();if(Number(total?.n||0)>=60)return Response.json({error:'Studio media limit reached. Remove unused files before uploading more.'},{status:429});
   }
  }
  const bytes=await file.arrayBuffer();
  const signature=new Uint8Array(bytes);
  const valid=file.type==='image/jpeg'?signature[0]===255&&signature[1]===216:file.type==='image/png'?signature[0]===137&&signature[1]===80:new TextDecoder().decode(signature.slice(8,12))==='WEBP';
  if(!valid)return Response.json({error:'The file does not match its image format.'},{status:400});
  objectId=crypto.randomUUID();
  await (env as any).BUCKET.put(objectId,bytes,{httpMetadata:{contentType:file.type}});
  await db.prepare('INSERT INTO uploads(id,owner,type,studio_id,room_id,booking_id,purpose,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(objectId,user.id,file.type,studioId||null,roomId||null,bookingId||null,purpose||null,new Date().toISOString()).run();
  return Response.json({url:'/api/media/'+objectId,id:objectId});
 }catch{
  if(objectId)try{await (env as any).BUCKET.delete(objectId)}catch{}
  return Response.json({error:'Image could not be uploaded. Please retry.'},{status:503});
 }
}
