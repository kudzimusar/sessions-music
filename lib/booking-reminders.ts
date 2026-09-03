import {database} from '@/db/store';
import {bookingStartsAt,createInAppNotification,studioInboxRecipient} from './booking-communications';
import {emailConfiguration,deliverEmail} from './notification-delivery';
import type {BookingNotification,NotificationPreference,Studio,StudioBooking} from './registry';

type Reminder='reminder_24h'|'reminder_2h';
const windowMs=12*60*1000;
const due=(booking:StudioBooking,now:number):Reminder|null=>{
 const difference=bookingStartsAt(booking)-now;
 if(Math.abs(difference-24*60*60*1000)<=windowMs)return 'reminder_24h';
 if(Math.abs(difference-2*60*60*1000)<=windowMs)return 'reminder_2h';
 return null;
};

const emailText=(studio:Studio,booking:StudioBooking,kind:Reminder)=>`${kind==='reminder_24h'?'Tomorrow':'In around two hours'}: ${studio.name}, ${booking.roomName}, ${booking.date} at ${String(Math.floor(booking.start/60)).padStart(2,'0')}:${String(booking.start%60).padStart(2,'0')} CAT. Check Sessions for the live booking and payment record before travelling.`;

/** Invoked by the Worker scheduled handler. It is safe to run more than once: recipient/idempotency keys suppress duplicate notices. */
export async function runBookingReminders(now=new Date()){
 const db=database(),nowIso=now.toISOString(),rows=(await db.prepare("SELECT content FROM studio_bookings WHERE json_extract(content,'$.status')='confirmed' ORDER BY rowid DESC LIMIT 2000").all()).results as Array<{content:string}>;
 let queued=0,delivered=0,failed=0;
 for(const row of rows){
  const booking=JSON.parse(row.content) as StudioBooking,kind=due(booking,now.getTime());if(!kind)continue;
  const studioRow=await db.prepare('SELECT owner,content FROM studio_registry WHERE id=?').bind(booking.studioId).first();if(!studioRow)continue;const studio=JSON.parse(studioRow.content) as Studio;
  const base=`${kind}:${booking.id}`;
  const recipients=[booking.customer,studioInboxRecipient(booking.studioId)];
  for(const recipient of recipients){
   const existing=await db.prepare('SELECT id FROM booking_notifications WHERE recipient=? AND idempotency_key=?').bind(recipient,base).first();if(existing)continue;
   const notification=createInAppNotification({booking,recipient,kind,now:nowIso,scheduledAt:nowIso,content:emailText(studio,booking,kind)});
   await db.prepare('INSERT INTO booking_notifications(id,booking_id,studio_id,recipient,channel,kind,status,idempotency_key,scheduled_at,created_at,attempts,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(notification.id,booking.id,booking.studioId,recipient,notification.channel,notification.kind,notification.status,base,nowIso,nowIso,0,JSON.stringify(notification)).run();queued++;
  }
  const emailConfig=emailConfiguration();if(!emailConfig.ready)continue;
  const emailRecipients=[booking.customer,studioRow.owner].filter((value):value is string=>!!value);
  for(const recipient of emailRecipients){
   const preferenceRow=await db.prepare('SELECT revision,content FROM booking_notification_preferences WHERE recipient=?').bind(recipient).first();if(!preferenceRow)continue;
   const preference={...JSON.parse(preferenceRow.content),revision:preferenceRow.revision} as NotificationPreference;if(!preference.emailConsent||!preference.reminderConsent||!preference.email)continue;
   const emailKey=`${base}:email`,existing=await db.prepare('SELECT id,status FROM booking_notifications WHERE recipient=? AND idempotency_key=?').bind(recipient,emailKey).first();
   let notificationId=existing?.id as string|undefined;
   if(!notificationId){notificationId='NTF-'+crypto.randomUUID();const pending:BookingNotification={id:notificationId,bookingId:booking.id,studioId:booking.studioId,recipient,channel:'email',kind,status:'pending',createdAt:nowIso,scheduledAt:nowIso,content:emailText(studio,booking,kind)};await db.prepare('INSERT INTO booking_notifications(id,booking_id,studio_id,recipient,channel,kind,status,idempotency_key,scheduled_at,created_at,attempts,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(pending.id,booking.id,booking.studioId,recipient,'email',kind,'pending',emailKey,nowIso,nowIso,0,JSON.stringify(pending)).run();}
   const claimed=await db.prepare("UPDATE booking_notifications SET status='sending',attempts=attempts+1 WHERE id=? AND status='pending'").bind(notificationId).run();if(!Number((claimed as any).meta?.changes??(claimed as any).changes??0))continue;
   try{await deliverEmail({idempotencyKey:emailKey,to:preference.email,subject:'Sessions booking reminder',text:emailText(studio,booking,kind)});await db.prepare("UPDATE booking_notifications SET status='delivered',sent_at=? WHERE id=? AND status='sending'").bind(new Date().toISOString(),notificationId).run();delivered++;}catch(error){await db.prepare("UPDATE booking_notifications SET status='failed' WHERE id=? AND status='sending'").bind(notificationId).run();console.error('Booking reminder email failed',error instanceof Error?error.message:'unknown error');failed++;}
  }
 }
 return {queued,delivered,failed};
}
