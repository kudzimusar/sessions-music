import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {database} from '@/db/store';
import {provisionStudioMembership} from '@/lib/supabase-admin';
import type {Claim,Studio,VerificationRequest} from '@/lib/registry';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const id=z.string().trim().min(1).max(100);

async function trustUser(){const user=await getProductionUser();if(!user)return null;if(!hasPermission(user,'claims:review')&&!hasPermission(user,'verification:review'))throw new Error('forbidden');return user}

export async function GET(){
 try{
  const user=await trustUser();if(!user)return response({error:'Sign in required.'},401);const db=database();
  const claimRows=(await db.prepare("SELECT c.id,c.studio_id,c.applicant,c.content,s.content studio_content,s.revision FROM studio_claim_requests c JOIN studio_registry s ON s.id=c.studio_id WHERE c.status='pending' ORDER BY c.rowid ASC LIMIT 200").all()).results;
  const verificationRows=(await db.prepare("SELECT v.id,v.studio_id,v.applicant,v.content,s.content studio_content,s.revision FROM studio_verification_requests v JOIN studio_registry s ON s.id=v.studio_id WHERE v.status='pending' ORDER BY v.rowid ASC LIMIT 200").all()).results;
  return response({
   claims:hasPermission(user,'claims:review')?claimRows.map((row:any)=>({claim:JSON.parse(row.content),studio:{id:row.studio_id,name:JSON.parse(row.studio_content).name,revision:row.revision}})):[],
   verifications:hasPermission(user,'verification:review')?verificationRows.map((row:any)=>({verification:JSON.parse(row.content),studio:{id:row.studio_id,name:JSON.parse(row.studio_content).name,revision:row.revision}})):[],
  });
 }catch(error){if(error instanceof Error&&error.message==='forbidden')return response({error:'Trust & Safety authority required.'},403);console.error('Trust queue failed',error instanceof Error?error.message:'Unknown error');return response({error:'Trust & Safety queue is temporarily unavailable.'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  const user=await trustUser();if(!user)return response({error:'Sign in required.'},401);if(Number(request.headers.get('content-length')||0)>9000)return response({error:'Request too large.'},413);
  const body=z.discriminatedUnion('type',[
   z.object({type:z.literal('reviewClaim'),studioId:id,id,decision:z.enum(['approved','rejected']),note:z.string().trim().min(20).max(2000),independentContact:z.literal(true),authorityChecked:z.literal(true)}),
   z.object({type:z.literal('reviewVerification'),studioId:id,id,decision:z.enum(['approved','rejected']),note:z.string().trim().min(20).max(2000),businessChecked:z.literal(true),premisesChecked:z.literal(true)}),
  ]).parse(await request.json());
  const db=database(),now=new Date().toISOString();const studioRow=await db.prepare('SELECT owner,revision,content FROM studio_registry WHERE id=?').bind(body.studioId).first();if(!studioRow)return response({error:'Studio not found.'},404);const studio:Studio={...JSON.parse(studioRow.content),revision:studioRow.revision};const statements:any[]=[];
  if(body.type==='reviewClaim'){
   if(!hasPermission(user,'claims:review'))return response({error:'Ownership-claim review authority required.'},403);
   const row=await db.prepare('SELECT status,content FROM studio_claim_requests WHERE id=? AND studio_id=?').bind(body.id,body.studioId).first();if(!row||row.status!=='pending')return response({error:'This claim is no longer pending.'},409);const claim:Claim=JSON.parse(row.content);if(claim.applicant===user.id)return response({error:'You cannot review your own ownership claim.'},403);if(studioRow.owner&&body.decision==='approved')return response({error:'This studio already has an owner.'},409);
   Object.assign(claim,{status:body.decision,note:body.note,reviewedBy:user.id,reviewedAt:now});statements.push(db.prepare('UPDATE studio_claim_requests SET status=?,content=? WHERE id=?').bind(body.decision,JSON.stringify(claim),claim.id));
   if(body.decision==='approved'){
    await provisionStudioMembership({studioId:body.studioId,studioName:studio.name,userId:claim.applicant,role:'owner',grantedBy:user.id});studio.status='claimed';delete studio.verifiedAt;statements.push(db.prepare('UPDATE studio_registry SET owner=? WHERE id=? AND owner IS NULL').bind(claim.applicant,body.studioId));
    const competing=(await db.prepare("SELECT id,content FROM studio_claim_requests WHERE studio_id=? AND id!=? AND status='pending'").bind(body.studioId,claim.id).all()).results;for(const other of competing){const value=JSON.parse(other.content);Object.assign(value,{status:'rejected',note:'Another ownership claim was approved. Use the correction pathway to dispute ownership.',reviewedBy:user.id,reviewedAt:now});statements.push(db.prepare('UPDATE studio_claim_requests SET status=?,content=? WHERE id=?').bind('rejected',JSON.stringify(value),other.id));}
   }
  }else{
   if(!hasPermission(user,'verification:review'))return response({error:'Studio-verification review authority required.'},403);
   const row=await db.prepare('SELECT status,content FROM studio_verification_requests WHERE id=? AND studio_id=?').bind(body.id,body.studioId).first();if(!row||row.status!=='pending')return response({error:'This verification request is no longer pending.'},409);const verification:VerificationRequest=JSON.parse(row.content);if(verification.applicant===user.id)return response({error:'You cannot review your own studio verification.'},403);
   Object.assign(verification,{status:body.decision,note:body.note,reviewedAt:now,reviewedBy:user.id});statements.push(db.prepare('UPDATE studio_verification_requests SET status=?,content=? WHERE id=?').bind(body.decision,JSON.stringify(verification),body.id));if(body.decision==='approved'){studio.status='verified';studio.verifiedAt=now}else{studio.status='claimed';delete studio.verifiedAt}
  }
  const guard=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN revision=? THEN 1 ELSE 0 END FROM studio_registry WHERE id=?))').bind(guard,studioRow.revision,body.studioId),...statements,db.prepare('UPDATE studio_registry SET content=?,revision=revision+1 WHERE id=?').bind(JSON.stringify(studio),body.studioId),db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),body.studioId,user.id,body.type+':'+body.decision,now),db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard)]);
  return response({ok:true});
 }catch(error){if(error instanceof z.ZodError)return response({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; ')},400);if(error instanceof Error&&error.message==='forbidden')return response({error:'Trust & Safety authority required.'},403);if(error instanceof Error&&/UNIQUE|CHECK|constraint/i.test(error.message))return response({error:'This record changed. Refresh the queue and review it again.'},409);console.error('Trust review failed',error instanceof Error?error.message:'Unknown error');return response({error:'Trust & Safety review could not be completed.'},503)}
}
