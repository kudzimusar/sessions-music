import {z} from 'zod';
import {getProductionUser,type SessionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import type {NotificationPreference} from '@/lib/registry';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
class Fault extends Error{constructor(message:string,public status=400){super(message)}}
const fail=(message:string,status=400):never=>{throw new Fault(message,status)};
const key=z.string().uuid();

export async function GET(){
 try{const user=await getProductionUser();if(!user)throw new Fault('Sign in to view notification preferences',401);const signedUser=user as SessionUser,row=await database().prepare('SELECT revision,content FROM booking_notification_preferences WHERE recipient=?').bind(signedUser.id).first();return response({preference:row?{...JSON.parse(row.content),revision:row.revision}:null});}catch(error){if(error instanceof Fault)return response({error:error.message},error.status);return response({error:'Notification preferences are unavailable'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)fail('Cross-origin request rejected',403);const user=await getProductionUser();if(!user)throw new Fault('Sign in to update notification preferences',401);const signedUser=user as SessionUser;if(Number(request.headers.get('content-length')||0)>3000)fail('Request too large',413);const value=z.object({key,revision:z.number().int().min(0),emailConsent:z.boolean(),reminderConsent:z.boolean()}).parse(await request.json());if(value.emailConsent&&!signedUser.email)fail('Add an email address to your verified account before enabling email reminders',409);
  const db=database(),existingEvent=await db.prepare('SELECT content FROM booking_notification_preference_events WHERE recipient=? AND idempotency_key=?').bind(signedUser.id,value.key).first();if(existingEvent)return response({ok:true,preference:JSON.parse(existingEvent.content),duplicate:true});const current=await db.prepare('SELECT revision FROM booking_notification_preferences WHERE recipient=?').bind(signedUser.id).first();if(Number(current?.revision||0)!==value.revision)fail('Your notification settings changed. Refresh and try again.',409);const now=new Date().toISOString(),preference:NotificationPreference={recipient:signedUser.id,email:signedUser.email||'',emailConsent:value.emailConsent,reminderConsent:value.reminderConsent,revision:value.revision+1,updatedAt:now};const guard=crypto.randomUUID();
  await db.batch([db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN COALESCE((SELECT revision FROM booking_notification_preferences WHERE recipient=?),0)=? THEN 1 ELSE 0 END))').bind(guard,signedUser.id,value.revision),db.prepare('INSERT INTO booking_notification_preferences(recipient,email,email_consent,reminder_consent,revision,updated_at,content) VALUES(?,?,?,?,?,?,?) ON CONFLICT(recipient) DO UPDATE SET email=excluded.email,email_consent=excluded.email_consent,reminder_consent=excluded.reminder_consent,revision=excluded.revision,updated_at=excluded.updated_at,content=excluded.content').bind(preference.recipient,preference.email,Number(preference.emailConsent),Number(preference.reminderConsent),preference.revision,now,JSON.stringify(preference)),db.prepare('INSERT INTO booking_notification_preference_events(id,recipient,idempotency_key,created_at,content) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),signedUser.id,value.key,now,JSON.stringify(preference)),db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard)]);
  return response({ok:true,preference});
 }catch(error){if(error instanceof Fault)return response({error:error.message},error.status);if(error instanceof z.ZodError)return response({error:'Invalid notification preferences'},400);if(error instanceof Error&&/UNIQUE|CHECK|constraint/i.test(error.message))return response({error:'These settings changed or were already saved. Refresh and try again.'},409);console.error('Notification preferences update failed',error);return response({error:'Unable to update notification preferences'},503)}
}
