import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {canManagePlatformRoles} from '@/lib/access-control';
import {database} from '@/db/store';
import {currentPrivilegedSession} from '@/lib/privileged-access';

const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('activate'),purpose:z.string().trim().min(8).max(300)}),
 z.object({action:z.literal('revoke')}),
]);
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const eventId=()=>`sevt_${crypto.randomUUID()}`;

export async function GET(){
 try{
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!canManagePlatformRoles(actor))return response({error:'Super administrator authority is required.'},403);
  const privileged=await currentPrivilegedSession(actor);
  return response({assuranceLevel:actor.assuranceLevel,eligible:actor.method!=='chatgpt_demo'&&actor.assuranceLevel==='aal2',privileged});
 }catch(error){
  console.error('Privileged session read failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Privileged session state is unavailable. Security schema may not be provisioned yet.'},503);
 }
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>5000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!canManagePlatformRoles(actor))return response({error:'Super administrator authority is required.'},403);
  const input=schema.parse(await request.json());const db=database();const at=new Date();const createdAt=at.toISOString();
  if(input.action==='revoke'){
   const current=await currentPrivilegedSession(actor);if(!current)return response({ok:true,privileged:null});
   await db.batch([
    db.prepare("UPDATE corporate_privileged_sessions SET status='revoked',revoked_at=? WHERE id=? AND status='active'").bind(createdAt,current.id),
    db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(eventId(),actor.id,actor.sessionId,'privileged_session.revoked','privileged_session',current.id,createdAt,'{}'),
   ]);
   return response({ok:true,privileged:null});
  }
  if(actor.method==='chatgpt_demo')return response({error:'Privileged administration cannot be activated from the ChatGPT preview identity. Use the production identity provider.'},403);
  if(actor.assuranceLevel!=='aal2')return response({error:'Multi-factor authentication is required before privileged administration can be activated.'},403);
  const expiresAt=new Date(at.getTime()+15*60*1000).toISOString();const id=`priv_${crypto.randomUUID()}`;
  const existing=await db.prepare("SELECT id,identity_session_id FROM corporate_privileged_sessions WHERE user_id=? AND status='active'").bind(actor.id).first();
  const statements:any[]=[];
  if(existing){
   statements.push(db.prepare("UPDATE corporate_privileged_sessions SET status='revoked',revoked_at=? WHERE id=? AND status='active'").bind(createdAt,existing.id));
   statements.push(db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(eventId(),actor.id,actor.sessionId,'privileged_session.replaced','privileged_session',existing.id,createdAt,JSON.stringify({replacedIdentitySessionId:existing.identity_session_id})));
  }
  statements.push(db.prepare('INSERT INTO corporate_privileged_sessions(id,user_id,identity_session_id,status,assurance_level,purpose,created_at,expires_at,revoked_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,actor.id,actor.sessionId,'active','aal2',input.purpose,createdAt,expiresAt,null,'{}'));
  statements.push(db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(eventId(),actor.id,actor.sessionId,'privileged_session.activated','privileged_session',id,createdAt,JSON.stringify({purpose:input.purpose,expiresAt})));
  await db.batch(statements);
  return response({ok:true,privileged:{id,purpose:input.purpose,createdAt,expiresAt}},201);
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid privileged-session request.'},400);
  console.error('Privileged session mutation failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Privileged administration could not be changed.'},503);
 }
}
