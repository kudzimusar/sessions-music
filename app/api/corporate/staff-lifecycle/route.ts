import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {database} from '@/db/store';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
const bodySchema=z.object({
 staffId:z.string().min(1).max(120),
 status:z.enum(['active','suspended','departed','terminated']),
 reasonCode:z.enum(['policy','security','employment_end','voluntary_exit','performance','administrative','other']),
 reason:z.string().trim().min(10).max(1000),
});
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>12_000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'organization:manage')||!hasPermission(actor,'identity:lifecycle.manage'))return response({error:'Staff lifecycle authority is required.'},403);
  const input=bodySchema.parse(await request.json());const db=database();
  const staff=await db.prepare('SELECT id,user_id,status FROM corporate_staff WHERE id=? LIMIT 1').bind(input.staffId).first();
  if(!staff)return response({error:'Staff record not found.'},404);
  const targetUserId=String(staff.user_id);
  if(targetUserId===actor.id&&input.status!=='active')return response({error:'You cannot suspend, depart or terminate your own corporate identity.'},409);
  const access=await db.prepare('SELECT status FROM corporate_staff_access_state WHERE staff_id=?').bind(input.staffId).first();
  const current=String(access?.status||staff.status||'active');
  if(current===input.status)return response({ok:true,staffId:input.staffId,status:input.status,unchanged:true,authorityChanged:false});
  if(current==='terminated'&&input.status!=='terminated')return response({error:'A terminated staff identity cannot be reactivated through this endpoint. Create a new reviewed employment record instead.'},409);
  if(current==='departed'&&input.status==='active')return response({error:'A departed staff identity requires a new employment record and access review before returning.'},409);
  const now=new Date().toISOString();const workforceStatus=input.status==='active'?'active':input.status==='suspended'?'suspended':'departed';
  const statements:any[]=[
   db.prepare(`INSERT INTO corporate_staff_access_state(staff_id,user_id,status,reason_code,reason,effective_at,updated_by,updated_at,content)
     VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(staff_id) DO UPDATE SET user_id=excluded.user_id,status=excluded.status,reason_code=excluded.reason_code,reason=excluded.reason,effective_at=excluded.effective_at,updated_by=excluded.updated_by,updated_at=excluded.updated_at,content=excluded.content`).bind(input.staffId,targetUserId,input.status,input.reasonCode,input.reason,now,actor.id,now,'{}'),
   db.prepare('UPDATE corporate_staff SET status=?,ended_at=?,updated_at=? WHERE id=?').bind(workforceStatus,['departed','terminated'].includes(input.status)?now.slice(0,10):null,now,input.staffId),
   db.prepare('INSERT INTO corporate_org_events(id,actor,event,entity_type,entity_id,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('orgevt'),actor.id,`staff.${input.status}`,'staff',input.staffId,now,JSON.stringify({targetUserId,previousStatus:current,status:input.status,reasonCode:input.reasonCode,reason:input.reason})),
   db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,context_id,reason_code,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(newId('life'),actor.id,targetUserId,`corporate.${input.status}`,'corporate',input.staffId,input.reasonCode,now,JSON.stringify({previousStatus:current,reason:input.reason})),
  ];
  if(input.status!=='active'){
   statements.push(
    db.prepare("UPDATE corporate_delegations SET status='revoked',revoked_at=? WHERE status IN ('scheduled','active') AND (principal_staff_id=? OR delegate_staff_id=?)").bind(now,input.staffId,input.staffId),
    db.prepare("UPDATE corporate_privileged_sessions SET status='revoked',revoked_at=? WHERE user_id=? AND status='active'").bind(now,targetUserId),
    db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(newId('secevt'),actor.id,actor.sessionId,'staff_authority_revoked','staff',input.staffId,now,JSON.stringify({targetUserId,status:input.status,reasonCode:input.reasonCode})),
   );
  }
  if(['departed','terminated'].includes(input.status))statements.push(db.prepare("UPDATE corporate_reporting_lines SET status='ended',effective_until=? WHERE status='active' AND (staff_id=? OR manager_staff_id=?)").bind(now.slice(0,10),input.staffId,input.staffId));
  await db.batch(statements);
  return response({ok:true,staffId:input.staffId,userId:targetUserId,status:input.status,previousStatus:current,authorityChanged:true,effectiveAt:now});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid staff lifecycle request.'},400);
  console.error('Staff lifecycle mutation failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Staff lifecycle change could not be completed.'},503);
 }
}
