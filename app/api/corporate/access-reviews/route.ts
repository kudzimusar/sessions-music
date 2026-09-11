import {z} from 'zod';
import {getProductionUser,type SessionUser} from '@/app/chatgpt-auth';
import {canManagePlatformRoles} from '@/lib/access-control';
import {platformRoles,type PlatformRole} from '@/lib/identity-core';
import {database} from '@/db/store';
import {requirePrivilegedSession} from '@/lib/privileged-access';
import {listActivePlatformRoleAssignments,setPlatformRole} from '@/lib/supabase-admin';

const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),title:z.string().trim().min(4).max(120),dueAt:z.string().datetime().nullable().optional()}),
 z.object({action:z.literal('decide'),itemId:z.string().min(8).max(100),decision:z.enum(['retain','revoke']),note:z.string().trim().max(500).default('')}),
 z.object({action:z.literal('remediate'),itemId:z.string().min(8).max(100)}),
 z.object({action:z.literal('complete'),reviewId:z.string().min(8).max(100)}),
]);
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const reviewId=()=>`arev_${crypto.randomUUID()}`;
const itemId=()=>`ari_${crypto.randomUUID()}`;
const eventId=()=>`sevt_${crypto.randomUUID()}`;
const managedRole=(value:string):value is PlatformRole=>value!=='musician'&&(platformRoles as readonly string[]).includes(value);

async function actor(){
 const user=await getProductionUser();
 if(!user)throw Object.assign(new Error('Sign in required.'),{status:401});
 if(!canManagePlatformRoles(user))throw Object.assign(new Error('Super administrator authority is required.'),{status:403});
 return user;
}
async function privilegedActor(){const user=await actor();await requirePrivilegedSession(user);return user}
function securityEvent(db:any,user:SessionUser,event:string,targetType:string,targetId:string,content:unknown,createdAt:string){
 return db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(eventId(),user.id,user.sessionId,event,targetType,targetId,createdAt,JSON.stringify(content));
}

export async function GET(request:Request){
 try{
  await actor();const db=database();
  const reviews=(await db.prepare('SELECT id,title,status,created_by,created_at,due_at,completed_at,snapshot_count FROM corporate_access_reviews ORDER BY created_at DESC LIMIT 30').all()).results||[];
  const requested=new URL(request.url).searchParams.get('reviewId');
  const selected=requested||String((reviews[0] as any)?.id||'');
  const items=selected?((await db.prepare('SELECT id,review_id,user_id,role,decision,remediation_status,reviewer,reviewed_at,remediated_at,snapshot_granted_by,snapshot_granted_at,content FROM corporate_access_review_items WHERE review_id=? ORDER BY role,user_id').bind(selected).all()).results||[]):[];
  return response({reviews:reviews.map((row:any)=>({id:row.id,title:row.title,status:row.status,createdBy:row.created_by,createdAt:row.created_at,dueAt:row.due_at,completedAt:row.completed_at,snapshotCount:Number(row.snapshot_count)})),selectedReviewId:selected||null,items:items.map((row:any)=>({id:row.id,reviewId:row.review_id,userId:row.user_id,role:row.role,decision:row.decision,remediationStatus:row.remediation_status,reviewer:row.reviewer,reviewedAt:row.reviewed_at,remediatedAt:row.remediated_at,snapshotGrantedBy:row.snapshot_granted_by,snapshotGrantedAt:row.snapshot_granted_at,note:JSON.parse(String(row.content||'{}')).note||''}))});
 }catch(error:any){
  const status=Number(error?.status)||503;if(status===401||status===403)return response({error:error.message},status);
  console.error('Access review read failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Access reviews are unavailable. The security schema may not be provisioned yet.'},503);
 }
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>8000)return response({error:'Request too large.'},413);
  const user=await privilegedActor();const input=schema.parse(await request.json());const db=database();const now=new Date().toISOString();
  if(input.action==='create'){
   const snapshot=(await listActivePlatformRoleAssignments()).filter(row=>row.role!=='musician');
   const id=reviewId();
   const statements=[
    db.prepare('INSERT INTO corporate_access_reviews(id,title,status,created_by,created_at,due_at,completed_at,snapshot_count,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,input.title,'open',user.id,now,input.dueAt||null,null,snapshot.length,JSON.stringify({source:'supabase.platform_role_assignments',scope:'active_managed_platform_roles'})),
    ...snapshot.map(row=>db.prepare('INSERT INTO corporate_access_review_items(id,review_id,user_id,role,decision,remediation_status,reviewer,reviewed_at,remediated_at,snapshot_granted_by,snapshot_granted_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(itemId(),id,row.userId,row.role,'pending','not_required',null,null,null,row.grantedBy,row.grantedAt,'{}')),
    securityEvent(db,user,'access_review.created','access_review',id,{snapshotCount:snapshot.length,title:input.title},now),
   ];
   await db.batch(statements);
   return response({ok:true,reviewId:id,snapshotCount:snapshot.length},201);
  }
  if(input.action==='decide'){
   const item=await db.prepare("SELECT i.id,i.review_id,i.user_id,i.role,r.status review_status FROM corporate_access_review_items i JOIN corporate_access_reviews r ON r.id=i.review_id WHERE i.id=?").bind(input.itemId).first();
   if(!item)return response({error:'Access review item not found.'},404);
   if(item.review_status!=='open')return response({error:'Only open access reviews can be changed.'},409);
   const remediation=input.decision==='revoke'?'pending':'not_required';
   await db.batch([
    db.prepare('UPDATE corporate_access_review_items SET decision=?,remediation_status=?,reviewer=?,reviewed_at=?,remediated_at=NULL,content=? WHERE id=?').bind(input.decision,remediation,user.id,now,JSON.stringify({note:input.note}),input.itemId),
    securityEvent(db,user,'access_review.decision','access_review_item',input.itemId,{decision:input.decision,role:item.role,userId:item.user_id,reviewId:item.review_id},now),
   ]);
   return response({ok:true,itemId:input.itemId,decision:input.decision,remediationStatus:remediation});
  }
  if(input.action==='remediate'){
   const item=await db.prepare("SELECT i.id,i.review_id,i.user_id,i.role,i.decision,i.remediation_status,r.status review_status FROM corporate_access_review_items i JOIN corporate_access_reviews r ON r.id=i.review_id WHERE i.id=?").bind(input.itemId).first();
   if(!item)return response({error:'Access review item not found.'},404);
   if(item.review_status!=='open')return response({error:'Only open access reviews can be remediated.'},409);
   if(item.decision!=='revoke')return response({error:'Only revoke decisions require remediation.'},409);
   if(item.remediation_status==='completed')return response({ok:true,itemId:input.itemId,remediationStatus:'completed'});
   if(String(item.user_id)===user.id&&String(item.role)==='super_admin')return response({error:'Do not revoke the current Super Admin through its own privileged session. Another authorized Super Admin must review this access.'},409);
   if(!managedRole(String(item.role)))return response({error:'This role is not managed by the platform-role provisioning boundary.'},409);
   try{
    await setPlatformRole({userId:String(item.user_id),role:String(item.role) as PlatformRole,enabled:false,grantedBy:user.id});
    const remediatedAt=new Date().toISOString();
    await db.batch([
     db.prepare("UPDATE corporate_access_review_items SET remediation_status='completed',remediated_at=? WHERE id=?").bind(remediatedAt,input.itemId),
     securityEvent(db,user,'access_review.remediated','access_review_item',input.itemId,{role:item.role,userId:item.user_id,reviewId:item.review_id},remediatedAt),
    ]);
    return response({ok:true,itemId:input.itemId,remediationStatus:'completed'});
   }catch(error){
    await db.prepare("UPDATE corporate_access_review_items SET remediation_status='failed' WHERE id=?").bind(input.itemId).run();
    throw error;
   }
  }
  const counts=await db.prepare("SELECT count(*) total,sum(CASE WHEN decision='pending' THEN 1 ELSE 0 END) pending,sum(CASE WHEN decision='revoke' AND remediation_status!='completed' THEN 1 ELSE 0 END) unremediated FROM corporate_access_review_items WHERE review_id=?").bind(input.reviewId).first();
  const review=await db.prepare('SELECT status FROM corporate_access_reviews WHERE id=?').bind(input.reviewId).first();
  if(!review)return response({error:'Access review not found.'},404);
  if(review.status!=='open')return response({error:'Only open access reviews can be completed.'},409);
  if(Number(counts?.pending||0)>0)return response({error:'Every access item must have a retain or revoke decision before completion.'},409);
  if(Number(counts?.unremediated||0)>0)return response({error:'Every revoke decision must be successfully remediated before completion.'},409);
  await db.batch([
   db.prepare("UPDATE corporate_access_reviews SET status='completed',completed_at=? WHERE id=? AND status='open'").bind(now,input.reviewId),
   securityEvent(db,user,'access_review.completed','access_review',input.reviewId,{itemCount:Number(counts?.total||0)},now),
  ]);
  return response({ok:true,reviewId:input.reviewId,status:'completed'});
 }catch(error:any){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid access review request.'},400);
  if(error instanceof Error&&error.message==='PRIVILEGED_SESSION_REQUIRED')return response({error:'Activate a current AAL2 privileged administration session before changing access reviews.'},403);
  const status=Number(error?.status);if(status===401||status===403)return response({error:error.message},status);
  console.error('Access review mutation failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Access review change could not be completed. Production identity provisioning may not be configured.'},503);
 }
}
