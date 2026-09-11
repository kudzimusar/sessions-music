import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {database} from '@/db/store';
import type {RegistryIssue} from '@/lib/registry';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(){
 try{
  const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);if(!hasPermission(user,'support:read'))return response({error:'Customer Support authority required.'},403);const db=database();
  const issueRows=(await db.prepare("SELECT i.id,i.content,s.content studio_content FROM studio_issues i LEFT JOIN studio_registry s ON s.id=json_extract(i.content,'$.studioId') WHERE json_extract(i.content,'$.status')='open' ORDER BY i.rowid ASC LIMIT 300").all()).results;
  const failedRows=(await db.prepare("SELECT id,booking_id,studio_id,recipient,kind,attempts,created_at,content FROM booking_notifications WHERE status='failed' ORDER BY created_at DESC LIMIT 200").all()).results;
  return response({issues:issueRows.map((row:any)=>({issue:JSON.parse(row.content),studio:row.studio_content?{name:JSON.parse(row.studio_content).name}:null})),failedNotifications:failedRows.map((row:any)=>({id:row.id,bookingId:row.booking_id,studioId:row.studio_id,kind:row.kind,attempts:row.attempts,createdAt:row.created_at}))});
 }catch(error){console.error('Support queue failed',error instanceof Error?error.message:'Unknown error');return response({error:'Customer Support queue is temporarily unavailable.'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);if(!hasPermission(user,'support:manage'))return response({error:'Customer Support resolution authority required.'},403);if(Number(request.headers.get('content-length')||0)>6000)return response({error:'Request too large.'},413);
  const body=z.object({type:z.literal('resolveIssue'),id:z.string().min(1).max(100),note:z.string().trim().min(10).max(1000)}).parse(await request.json());const db=database();const row=await db.prepare('SELECT content FROM studio_issues WHERE id=?').bind(body.id).first();if(!row)return response({error:'Issue not found.'},404);const issue:RegistryIssue=JSON.parse(row.content);if(issue.status!=='open')return response({error:'This issue is already resolved.'},409);const now=new Date().toISOString();Object.assign(issue,{status:'resolved',resolutionNote:body.note,resolvedBy:user.id,resolvedAt:now});await db.batch([db.prepare('UPDATE studio_issues SET content=? WHERE id=?').bind(JSON.stringify(issue),body.id),db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),issue.studioId,user.id,'support:resolveIssue',now)]);return response({ok:true,issue});
 }catch(error){if(error instanceof z.ZodError)return response({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; ')},400);console.error('Support resolution failed',error instanceof Error?error.message:'Unknown error');return response({error:'Customer Support action could not be completed.'},503)}
}
