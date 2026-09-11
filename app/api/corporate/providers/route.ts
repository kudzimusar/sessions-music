import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {database} from '@/db/store';
import {registrationAction} from '@/db/registrations';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(){
 try{
  const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);
  if(!hasPermission(user,'providers:oversight'))return response({error:'Provider Operations authority required.'},403);
  const db=database();const rows=(await db.prepare("SELECT id,applicant,created_at,content FROM (SELECT id,applicant,json_extract(content,'$.createdAt') created_at,content FROM studio_registrations WHERE status='pending') ORDER BY created_at ASC LIMIT 200").all()).results;
  return response({registrations:rows.map((row:any)=>{const value=JSON.parse(row.content);return {id:row.id,applicant:row.applicant,name:value.name,area:value.area,address:value.address,category:value.category,website:value.website,phone:value.phone,representative:value.representative,evidence:value.evidence,createdAt:value.createdAt}})});
 }catch(error){console.error('Provider Operations queue failed',error instanceof Error?error.message:'Unknown error');return response({error:'Provider review queue is temporarily unavailable.'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);
  if(!hasPermission(user,'providers:oversight'))return response({error:'Provider Operations authority required.'},403);
  if(Number(request.headers.get('content-length')||0)>8000)return response({error:'Request too large.'},413);
  const body=z.object({type:z.literal('reviewRegistration'),id:z.string().min(1).max(100),decision:z.enum(['approved','rejected']),note:z.string().trim().min(20).max(2000),independentContact:z.literal(true),authorityChecked:z.literal(true)}).parse(await request.json());
  const result=await registrationAction(body,user.id,true);return result||response({error:'Unsupported Provider Operations action.'},400);
 }catch(error){if(error instanceof z.ZodError)return response({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; ')},400);console.error('Provider Operations review failed',error instanceof Error?error.message:'Unknown error');return response({error:'Provider review could not be completed.'},503)}
}
