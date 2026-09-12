import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {canManagePlatformRoles} from '@/lib/access-control';
import {platformRoles} from '@/lib/identity-core';
import {setPlatformRole} from '@/lib/supabase-admin';
import {requirePrivilegedSession} from '@/lib/privileged-access';
import {database} from '@/db/store';

const schema=z.object({
 userId:z.string().uuid(),
 role:z.enum(platformRoles).refine(role=>role!=='musician','The base customer role is managed automatically.'),
 enabled:z.boolean(),
});

function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
const eventId=()=>`sevt_${crypto.randomUUID()}`;
function audit(db:any,actor:{id:string;sessionId:string},event:string,targetId:string,content:unknown,createdAt=new Date().toISOString()){
 return db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(eventId(),actor.id,actor.sessionId,event,'platform_user',targetId,createdAt,JSON.stringify(content));
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!canManagePlatformRoles(actor))return response({error:'Super administrator authority is required.'},403);
  if(Number(request.headers.get('content-length')||0)>5000)return response({error:'Request too large.'},413);
  const privileged=await requirePrivilegedSession(actor).catch(error=>{if(error instanceof Error&&error.message==='PRIVILEGED_SESSION_REQUIRED')return null;throw error});
  if(!privileged)return response({error:'Activate a current AAL2 privileged administration session before changing platform authority.'},403);
  const input=schema.parse(await request.json());
  if(input.userId===actor.id&&input.role==='super_admin'&&!input.enabled)return response({error:'A super administrator cannot remove their own final authority from this endpoint.'},409);
  const db=database();const requestedAt=new Date().toISOString();const auditContext={role:input.role,enabled:input.enabled,privilegedSessionId:privileged.id};
  // Persist intent before touching the external authority source. If this write fails, no role mutation is attempted.
  await audit(db,actor,'platform_role.change_requested',input.userId,auditContext,requestedAt).run();
  try{
   await setPlatformRole({...input,grantedBy:actor.id});
  }catch(error){
   try{await audit(db,actor,'platform_role.change_failed',input.userId,{...auditContext,error:'authority_source_change_or_verification_failed'}).run()}catch(auditError){console.error('Platform role failure audit could not be recorded',auditError instanceof Error?auditError.message:'Unknown error')}
   throw error;
  }
  const event=input.enabled?'platform_role.granted':'platform_role.revoked';
  try{
   await audit(db,actor,event,input.userId,auditContext).run();
   return response({ok:true,userId:input.userId,role:input.role,enabled:input.enabled,auditRecorded:true});
  }catch(error){
   // The authority mutation is already verified in Supabase. The earlier intent record keeps the action reconstructable.
   console.error('Platform role outcome audit could not be recorded',error instanceof Error?error.message:'Unknown error');
   return response({ok:true,userId:input.userId,role:input.role,enabled:input.enabled,auditRecorded:false,warning:'Authority changed and was verified, but the final outcome audit write failed. Reconcile the security event log.'},202);
  }
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid role assignment.'},400);
  console.error('Platform role assignment failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Role assignment could not be completed. Production identity or privileged-security provisioning may not be configured.'},503);
 }
}
