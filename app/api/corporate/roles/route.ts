import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {canManagePlatformRoles} from '@/lib/access-control';
import {platformRoles} from '@/lib/identity-core';
import {setPlatformRole} from '@/lib/supabase-admin';

const schema=z.object({
 userId:z.string().uuid(),
 role:z.enum(platformRoles).refine(role=>role!=='musician','The base customer role is managed automatically.'),
 enabled:z.boolean(),
});

function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!canManagePlatformRoles(actor))return response({error:'Super administrator authority is required.'},403);
  if(Number(request.headers.get('content-length')||0)>5000)return response({error:'Request too large.'},413);
  const input=schema.parse(await request.json());
  if(input.userId===actor.id&&input.role==='super_admin'&&!input.enabled)return response({error:'A super administrator cannot remove their own final authority from this endpoint.'},409);
  await setPlatformRole({...input,grantedBy:actor.id});
  return response({ok:true,userId:input.userId,role:input.role,enabled:input.enabled});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid role assignment.'},400);
  console.error('Platform role assignment failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Role assignment could not be completed. Production identity provisioning may not be configured.'},503);
 }
}
