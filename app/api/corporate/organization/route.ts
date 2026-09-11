import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {database} from '@/db/store';

const id=z.string().min(1).max(120);
const code=z.string().trim().min(2).max(32).regex(/^[A-Za-z0-9_-]+$/,'Use letters, numbers, hyphens or underscores.').transform(value=>value.toUpperCase());
const optionalId=z.union([id,z.literal(''),z.null()]).optional().transform(value=>value||null);
const iso=z.string().datetime({offset:true});

const mutation=z.discriminatedUnion('action',[
 z.object({action:z.literal('createDepartment'),code,name:z.string().trim().min(2).max(120),parentDepartmentId:optionalId,description:z.string().trim().max(500).optional().default('')}),
 z.object({action:z.literal('createPosition'),departmentId:id,code,title:z.string().trim().min(2).max(120),level:z.coerce.number().int().min(0).max(30),reportsToPositionId:optionalId,isDepartmentHead:z.boolean().optional().default(false),description:z.string().trim().max(500).optional().default('')}),
 z.object({action:z.literal('createStaff'),userId:z.string().trim().min(3).max(200),staffCode:code,positionId:optionalId,displayName:z.string().trim().min(2).max(120),workEmail:z.union([z.string().email(),z.literal('')]).optional().default(''),location:z.string().trim().max(120).optional().default(''),employmentType:z.enum(['employee','contractor','advisor']).optional().default('employee'),startedAt:z.string().date().optional()}),
 z.object({action:z.literal('setReportingLine'),staffId:id,managerStaffId:id,kind:z.enum(['primary','dotted']),effectiveFrom:z.string().date().optional()}),
 z.object({action:z.literal('createDelegation'),principalStaffId:id,delegateStaffId:id,scope:z.enum(['department','position','workflow','all']),startsAt:iso,endsAt:iso,reason:z.string().trim().min(3).max(500)}),
]);

type Row=Record<string,unknown>;
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const safeJson=(value:unknown)=>{try{return typeof value==='string'?JSON.parse(value):{}}catch{return {}}};
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const now=()=>new Date().toISOString();

async function exists(db:any,table:string,key:string,value:string){
 return !!(await db.prepare(`SELECT 1 ok FROM ${table} WHERE ${key} = ? LIMIT 1`).bind(value).first());
}

async function activeStaff(db:any,staffId:string){
 return !!(await db.prepare("SELECT 1 ok FROM corporate_staff WHERE id = ? AND status = 'active' LIMIT 1").bind(staffId).first());
}

async function reportingCycle(db:any,staffId:string,managerStaffId:string){
 const rows=(await db.prepare("SELECT staff_id,manager_staff_id FROM corporate_reporting_lines WHERE kind='primary' AND status='active'").all()).results as Row[];
 const parent=new Map(rows.map(row=>[String(row.staff_id),String(row.manager_staff_id)]));
 parent.set(staffId,managerStaffId);
 let cursor=managerStaffId;const seen=new Set<string>();
 while(cursor){
  if(cursor===staffId)return true;
  if(seen.has(cursor))return true;
  seen.add(cursor);cursor=parent.get(cursor)||'';
 }
 return false;
}

export async function GET(){
 try{
  const actor=await getProductionUser();
  if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'organization:read'))return response({error:'Organization directory authority is required.'},403);
  const db=database();const canManage=hasPermission(actor,'organization:manage');
  const [departmentsResult,positionsResult,staffResult,reportingResult,delegationsResult]=await Promise.all([
   db.prepare('SELECT * FROM corporate_departments ORDER BY status ASC,name COLLATE NOCASE ASC').all(),
   db.prepare('SELECT * FROM corporate_positions ORDER BY level ASC,title COLLATE NOCASE ASC').all(),
   db.prepare("SELECT * FROM corporate_staff ORDER BY CASE status WHEN 'active' THEN 0 WHEN 'invited' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END, staff_code ASC").all(),
   db.prepare("SELECT * FROM corporate_reporting_lines WHERE status='active' ORDER BY kind ASC,effective_from ASC").all(),
   db.prepare("SELECT * FROM corporate_delegations WHERE status IN ('scheduled','active') ORDER BY starts_at ASC").all(),
  ]);
  const departments=(departmentsResult.results as Row[]).map(row=>{const content=safeJson(row.content);return {id:row.id,code:row.code,name:row.name,parentDepartmentId:row.parent_department_id,status:row.status,description:content.description||''}});
  const positions=(positionsResult.results as Row[]).map(row=>{const content=safeJson(row.content);return {id:row.id,departmentId:row.department_id,code:row.code,title:row.title,level:row.level,reportsToPositionId:row.reports_to_position_id,isDepartmentHead:!!row.is_department_head,status:row.status,description:content.description||''}});
  const staff=(staffResult.results as Row[]).map(row=>{const content=safeJson(row.content);return {id:row.id,staffCode:row.staff_code,positionId:row.position_id,status:row.status,displayName:content.displayName||'Unnamed staff member',location:content.location||'',startedAt:row.started_at,...(canManage?{identityUserId:row.user_id,workEmail:content.workEmail||'',employmentType:content.employmentType||'employee'}:{})}});
  const reporting=(reportingResult.results as Row[]).map(row=>({id:row.id,staffId:row.staff_id,managerStaffId:row.manager_staff_id,kind:row.kind,effectiveFrom:row.effective_from}));
  const delegations=(delegationsResult.results as Row[]).map(row=>{const content=safeJson(row.content);return {id:row.id,principalStaffId:row.principal_staff_id,delegateStaffId:row.delegate_staff_id,scope:row.scope,status:row.status,startsAt:row.starts_at,endsAt:row.ends_at,reason:content.reason||''}});
  return response({departments,positions,staff,reporting,delegations,canManage,generatedAt:now(),authorityNote:'Organization hierarchy and delegation do not grant platform roles or permissions.'});
 }catch(error){
  console.error('Corporate organization read failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Corporate organization data is unavailable. The workforce schema may not be provisioned yet.'},503);
 }
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>20_000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();
  if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'organization:manage'))return response({error:'Corporate organization administration authority is required.'},403);
  const input=mutation.parse(await request.json());const db=database();const createdAt=now();
  let entityId='';let event='';let statement:any;
  if(input.action==='createDepartment'){
   if(input.parentDepartmentId&&!(await exists(db,'corporate_departments','id',input.parentDepartmentId)))return response({error:'Parent department does not exist.'},409);
   entityId=newId('dept');event='department.created';
   statement=db.prepare('INSERT INTO corporate_departments(id,code,name,parent_department_id,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(entityId,input.code,input.name,input.parentDepartmentId,'active',createdAt,createdAt,JSON.stringify({description:input.description}));
  }else if(input.action==='createPosition'){
   if(!(await exists(db,'corporate_departments','id',input.departmentId)))return response({error:'Department does not exist.'},409);
   if(input.reportsToPositionId&&!(await exists(db,'corporate_positions','id',input.reportsToPositionId)))return response({error:'Reporting position does not exist.'},409);
   entityId=newId('pos');event='position.created';
   statement=db.prepare('INSERT INTO corporate_positions(id,department_id,code,title,level,reports_to_position_id,is_department_head,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(entityId,input.departmentId,input.code,input.title,input.level,input.reportsToPositionId,input.isDepartmentHead?1:0,'active',createdAt,createdAt,JSON.stringify({description:input.description}));
  }else if(input.action==='createStaff'){
   if(input.positionId&&!(await exists(db,'corporate_positions','id',input.positionId)))return response({error:'Position does not exist.'},409);
   entityId=newId('staff');event='staff.created';
   statement=db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,position_id,status,started_at,ended_at,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(entityId,input.userId,input.staffCode,input.positionId,'active',input.startedAt||createdAt.slice(0,10),null,createdAt,createdAt,JSON.stringify({displayName:input.displayName,workEmail:input.workEmail,location:input.location,employmentType:input.employmentType}));
  }else if(input.action==='setReportingLine'){
   if(input.staffId===input.managerStaffId)return response({error:'A staff member cannot report to themselves.'},409);
   if(!(await activeStaff(db,input.staffId))||!(await activeStaff(db,input.managerStaffId)))return response({error:'Both reporting-line participants must be active staff.'},409);
   if(input.kind==='primary'&&await reportingCycle(db,input.staffId,input.managerStaffId))return response({error:'This reporting line would create an organizational cycle.'},409);
   entityId=newId('report');event='reporting_line.created';const effectiveFrom=input.effectiveFrom||createdAt.slice(0,10);
   const statements=[] as any[];
   if(input.kind==='primary')statements.push(db.prepare("UPDATE corporate_reporting_lines SET status='ended', effective_until=? WHERE staff_id=? AND kind='primary' AND status='active'").bind(effectiveFrom,input.staffId));
   statements.push(db.prepare('INSERT INTO corporate_reporting_lines(id,staff_id,manager_staff_id,kind,status,effective_from,effective_until,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(entityId,input.staffId,input.managerStaffId,input.kind,'active',effectiveFrom,null,createdAt,'{}'));
   statements.push(db.prepare('INSERT INTO corporate_org_events(id,actor,event,entity_type,entity_id,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('orgevt'),actor.id,event,'reporting_line',entityId,createdAt,JSON.stringify({staffId:input.staffId,managerStaffId:input.managerStaffId,kind:input.kind})));
   await db.batch(statements);return response({ok:true,id:entityId,authorityChanged:false},201);
  }else{
   if(input.principalStaffId===input.delegateStaffId)return response({error:'A staff member cannot delegate to themselves.'},409);
   if(!(await activeStaff(db,input.principalStaffId))||!(await activeStaff(db,input.delegateStaffId)))return response({error:'Both delegation participants must be active staff.'},409);
   if(Date.parse(input.startsAt)>=Date.parse(input.endsAt))return response({error:'Delegation end time must be after its start time.'},409);
   entityId=newId('deleg');event='delegation.created';const status=Date.parse(input.startsAt)>Date.now()?'scheduled':'active';
   statement=db.prepare('INSERT INTO corporate_delegations(id,principal_staff_id,delegate_staff_id,scope,status,starts_at,ends_at,created_by,created_at,revoked_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(entityId,input.principalStaffId,input.delegateStaffId,input.scope,status,input.startsAt,input.endsAt,actor.id,createdAt,null,JSON.stringify({reason:input.reason}));
  }
  const entityType=input.action==='createDepartment'?'department':input.action==='createPosition'?'position':input.action==='createStaff'?'staff':'delegation';
  await db.batch([statement,db.prepare('INSERT INTO corporate_org_events(id,actor,event,entity_type,entity_id,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('orgevt'),actor.id,event,entityType,entityId,createdAt,JSON.stringify({action:input.action}))]);
  return response({ok:true,id:entityId,authorityChanged:false},201);
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid organization request.'},400);
  const message=error instanceof Error?error.message:'Unknown error';
  if(/UNIQUE constraint failed/i.test(message))return response({error:'That organization code or staff identity is already in use.'},409);
  console.error('Corporate organization mutation failed',message);
  return response({error:'Corporate organization change could not be completed.'},503);
 }
}
