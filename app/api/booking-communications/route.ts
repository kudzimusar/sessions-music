import {z} from 'zod';
import {getProductionUser,type SessionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {bookingAccess} from '@/lib/booking-access';
import {createInAppNotification,studioInboxRecipient,whatsappHref} from '@/lib/booking-communications';
import type {BookingMessage} from '@/lib/registry';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class Fault extends Error{constructor(message:string,public status=400){super(message)}}
const fail=(message:string,status=400):never=>{throw new Fault(message,status)};
const id=z.string().trim().min(1).max(120),key=z.string().uuid();
const messageStates=['requested','confirmed','completed'];

async function participant(user:SessionUser,bookingId:string,studioId:string){
 const access=await bookingAccess(user,bookingId,studioId);if(!access)throw new Fault('This booking belongs to another account',403);if(access.role==='operations')throw new Fault('Operations cannot browse private booking conversations',403);return access;
}

export async function GET(request:Request){
 try{
  const user=await getProductionUser();if(!user)throw new Fault('Sign in to view booking messages',401);const signedUser=user as SessionUser,url=new URL(request.url),bookingId=id.parse(url.searchParams.get('booking')),studioId=id.parse(url.searchParams.get('studio'));
  const access=await participant(signedUser,bookingId,studioId),db=database();
  const messages=(await db.prepare('SELECT content FROM booking_messages WHERE booking_id=? AND studio_id=? ORDER BY created_at ASC LIMIT 500').bind(bookingId,studioId).all()).results.map((row:any)=>JSON.parse(row.content) as BookingMessage);
  return response({bookingId,recipient:access.recipient,messages});
 }catch(error){if(error instanceof Fault)return response({error:error.message},error.status);if(error instanceof z.ZodError)return response({error:'Invalid booking message request'},400);console.error('Booking messages load failed',error);return response({error:'Booking messages are temporarily unavailable'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)fail('Cross-origin request rejected',403);
  const user=await getProductionUser();if(!user)throw new Fault('Sign in to use booking messages',401);const signedUser=user as SessionUser;if(Number(request.headers.get('content-length')||0)>16_000)fail('Request too large',413);const source=await request.text();if(source.length>16_000)fail('Request too large',413);let raw:any;try{raw=JSON.parse(source)}catch{fail('Invalid JSON')};
  const type=z.enum(['send','markRead','whatsappLink']).parse(raw.type),bookingId=id.parse(raw.bookingId),studioId=id.parse(raw.studioId),access=await participant(signedUser,bookingId,studioId),db=database(),now=new Date().toISOString();
  if(type==='markRead'){
   await db.prepare("INSERT INTO booking_message_reads(booking_id,recipient,last_read_at) VALUES(?,?,?) ON CONFLICT(booking_id,recipient) DO UPDATE SET last_read_at=CASE WHEN excluded.last_read_at>booking_message_reads.last_read_at THEN excluded.last_read_at ELSE booking_message_reads.last_read_at END").bind(bookingId,access.recipient,now).run();
   return response({ok:true,readAt:now});
  }
  if(type==='whatsappLink'){
   const value=z.object({key}).parse(raw);if(!messageStates.includes(access.booking.status))fail('This booking conversation is closed',409);const recipient=access.role==='musician'?studioInboxRecipient(studioId):access.booking.customer;const phone=access.role==='musician'?access.studio.phone:access.booking.phone;if(!phone)fail('No contact number is available for this booking',409);
   const href=whatsappHref(phone,`Sessions booking ${access.booking.id}: ${access.studio.name}, ${access.booking.roomName}, ${access.booking.date}. Please check the live Sessions record before making travel or payment decisions.`);
   const existing=await db.prepare('SELECT id FROM booking_notifications WHERE recipient=? AND idempotency_key=?').bind(recipient,`whatsapp:${value.key}`).first();
   if(!existing){const note={id:'NTF-'+crypto.randomUUID(),bookingId,studioId,recipient,channel:'whatsapp',kind:'message_received',status:'user_opened',createdAt:now,content:'A user opened a WhatsApp deep link from the booking thread; Sessions did not send this message.'};await db.batch([db.prepare('INSERT INTO booking_notifications(id,booking_id,studio_id,recipient,channel,kind,status,idempotency_key,created_at,attempts,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(note.id,bookingId,studioId,recipient,note.channel,note.kind,note.status,`whatsapp:${value.key}`,now,0,JSON.stringify(note)),db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),studioId,signedUser.id,'open WhatsApp booking link',now)]);}
   return response({ok:true,href});
  }
  const value=z.object({key,body:z.string().trim().max(2000).default(''),attachmentMediaId:z.string().uuid().optional()}).parse(raw);if(!value.body&&!value.attachmentMediaId)fail('Write a message or attach one image');if(!messageStates.includes(access.booking.status))fail('This booking conversation is closed',409);
  const existing=await db.prepare('SELECT content FROM booking_messages WHERE sender=? AND idempotency_key=?').bind(signedUser.id,value.key).first();if(existing)return response({ok:true,message:JSON.parse(existing.content),duplicate:true});
  if(value.attachmentMediaId){const media=await db.prepare("SELECT id FROM uploads WHERE id=? AND owner=? AND studio_id=? AND booking_id=? AND purpose='booking_message_attachment'").bind(value.attachmentMediaId,signedUser.id,studioId,bookingId).first();if(!media)fail('That image does not belong to this booking message',403);}
  const senderSide=access.role==='musician'?'musician':'studio',recipient=senderSide==='musician'?studioInboxRecipient(studioId):access.booking.customer;const message:BookingMessage={id:'MSG-'+crypto.randomUUID(),bookingId,studioId,sender:signedUser.id,senderSide,recipient,body:value.body,attachmentMediaId:value.attachmentMediaId,createdAt:now};const notification=createInAppNotification({booking:access.booking,recipient,kind:'message_received',content:senderSide==='musician'?`New message from ${access.booking.name} about ${access.booking.roomName}.`:`New message from ${access.studio.name} about ${access.booking.roomName}.`,now});
  await db.batch([db.prepare('INSERT INTO booking_messages(id,booking_id,studio_id,sender,sender_side,recipient,attachment_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(message.id,bookingId,studioId,message.sender,message.senderSide,recipient,message.attachmentMediaId||null,value.key,now,JSON.stringify(message)),db.prepare('INSERT INTO booking_notifications(id,booking_id,studio_id,recipient,channel,kind,status,idempotency_key,created_at,attempts,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(notification.id,bookingId,studioId,recipient,notification.channel,notification.kind,notification.status,`message:${message.id}`,now,0,JSON.stringify(notification)),db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),studioId,signedUser.id,'send booking message',now)]);
  return response({ok:true,message});
 }catch(error){if(error instanceof Fault)return response({error:error.message},error.status);if(error instanceof z.ZodError)return response({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; ')},400);if(error instanceof Error&&/UNIQUE|CHECK|constraint/i.test(error.message))return response({error:'This message was already recorded or changed. Refresh and try again.'},409);console.error('Booking message update failed',error);return response({error:'Unable to save this booking message'},503)}
}
