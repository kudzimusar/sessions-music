import type {SessionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';

export type PrivilegedSession={id:string;userId:string;identitySessionId:string;purpose:string;createdAt:string;expiresAt:string};

export async function currentPrivilegedSession(user:SessionUser,at=Date.now()):Promise<PrivilegedSession|null>{
 if(user.method==='chatgpt_demo'||user.assuranceLevel!=='aal2'||!user.deviceRegistered)return null;
 const db=database();
 const row=await db.prepare("SELECT id,user_id,identity_session_id,purpose,created_at,expires_at FROM corporate_privileged_sessions WHERE user_id=? AND identity_session_id=? AND status='active' LIMIT 1").bind(user.id,user.sessionId).first();
 if(!row)return null;
 if(Date.parse(String(row.expires_at))<=at){
  const expiredAt=new Date(at).toISOString();
  await db.batch([
   db.prepare("UPDATE corporate_privileged_sessions SET status='expired', revoked_at=? WHERE id=? AND status='active'").bind(expiredAt,row.id),
   db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(`sevt_${crypto.randomUUID()}`,user.id,user.sessionId,'privileged_session.expired','privileged_session',row.id,expiredAt,'{}'),
  ]);
  return null;
 }
 return {id:String(row.id),userId:String(row.user_id),identitySessionId:String(row.identity_session_id),purpose:String(row.purpose),createdAt:String(row.created_at),expiresAt:String(row.expires_at)};
}

export async function requirePrivilegedSession(user:SessionUser){
 const session=await currentPrivilegedSession(user);
 if(!session)throw new Error('PRIVILEGED_SESSION_REQUIRED');
 return session;
}
