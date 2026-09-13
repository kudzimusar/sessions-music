import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {hasPermission} from '@/lib/access-control';
import {
 canManageCaseCategory,
 canReadCaseCategory,
 canReadCaseLinkedObject,
 canReadCustomerField,
 type CaseCategory,
 type CaseLinkedObjectType,
 type DataClassification,
} from '@/lib/data-access-policy';
import {canTransitionCase,caseReference,caseStatuses,maskedReference,requiresCaseResolution,type CaseStatus} from '@/lib/phase5-operations';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
const id=z.string().trim().min(1).max(160);
const optionalId=z.union([id,z.literal(''),z.null()]).optional().transform(value=>value||null);
const iso=z.string().datetime({offset:true});
const caseCategories=['customer_support','booking_operations','provider_operations','trust_safety','finance','general_incident'] as const;
const category=z.enum(caseCategories);
const classification=z.enum(['internal','restricted','confidential']);
const team=z.enum(['marketplace_operations','customer_support','provider_operations','trust_safety','finance','governance']);
const linkableTypes=['booking','studio','customer','settlement'] as const;
const mutation=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),category,severity:z.enum(['low','medium','high','critical']).default('medium'),priority:z.enum(['low','normal','high','urgent']).default('normal'),classification:classification.default('internal'),source:z.enum(['staff','customer','provider','system','booking_signal']),bookingId:optionalId,studioId:optionalId,customer:optionalId,settlementId:optionalId,summary:z.string().trim().min(5).max(240),description:z.string().trim().min(5).max(5000),slaTargetAt:z.union([iso,z.literal(''),z.null()]).optional().transform(value=>value||null),idempotencyKey:id}),
 z.object({action:z.literal('transition'),caseId:id,to:z.enum(caseStatuses),revision:z.number().int().min(0),reason:z.string().trim().min(3).max(2000),resolutionCode:z.string().trim().min(2).max(120).optional(),idempotencyKey:id}),
 z.object({action:z.literal('reopen'),caseId:id,revision:z.number().int().min(0),reason:z.string().trim().min(10).max(2000),idempotencyKey:id}),
 z.object({action:z.literal('assign'),caseId:id,revision:z.number().int().min(0),assignedTo:optionalId,assignedTeam:z.union([team,z.literal(''),z.null()]).optional().transform(value=>value||null),reason:z.string().trim().min(3).max(1000),idempotencyKey:id}),
 z.object({action:z.literal('note'),caseId:id,note:z.string().trim().min(2).max(5000),visibility:z.enum(['internal','customer','provider']).default('internal'),classification:classification.default('internal'),idempotencyKey:id}),
 z.object({action:z.literal('setSla'),caseId:id,revision:z.number().int().min(0),slaTargetAt:z.union([iso,z.literal(''),z.null()]).optional().transform(value=>value||null),nextActionAt:z.union([iso,z.literal(''),z.null()]).optional().transform(value=>value||null),reason:z.string().trim().min(3).max(1000),idempotencyKey:id}),
 z.object({action:z.literal('link'),caseId:id,objectType:z.enum(linkableTypes),objectId:id,idempotencyKey:id}),
 z.object({action:z.literal('evidence'),caseId:id,mediaId:z.string().uuid(),note:z.string().trim().min(3).max(2000),idempotencyKey:id}),
]);

const parse=(value:unknown)=>{try{return JSON.parse(String(value||'{}')) as Record<string,unknown>}catch{return {}}};
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const restricted=(value:string)=>value==='restricted'||value==='confidential';

async function loadCase(db:any,caseId:string){return await db.prepare('SELECT * FROM operational_cases WHERE id=? LIMIT 1').bind(caseId).first() as Record<string,unknown>|undefined}
function caseCategory(row:Record<string,unknown>){return String(row.category) as CaseCategory}
function caseClassification(row:Record<string,unknown>){return String(row.classification) as DataClassification}
async function assertObject(db:any,type:CaseLinkedObjectType,value:string){
 const queries:Record<Exclude<CaseLinkedObjectType,'media'>,string>={booking:'SELECT 1 ok FROM studio_bookings WHERE id=? LIMIT 1',studio:'SELECT 1 ok FROM studio_registry WHERE id=? LIMIT 1',customer:'SELECT 1 ok FROM sessions_user_profiles WHERE user_id=? LIMIT 1',settlement:'SELECT 1 ok FROM studio_settlements WHERE id=? LIMIT 1'};
 if(type==='media')return false;
 return !!(await db.prepare(queries[type]).bind(value).first());
}
async function duplicate(db:any,actor:string,key:string){return await db.prepare('SELECT id FROM operational_case_events WHERE actor=? AND idempotency_key=? LIMIT 1').bind(actor,key).first() as Record<string,unknown>|undefined}
function sanitizeEventContent(actor:NonNullable<Awaited<ReturnType<typeof getProductionUser>>>,event:string,content:Record<string,unknown>){
 if(event!=='object.linked')return content;
 const objectType=typeof content.objectType==='string'?content.objectType as CaseLinkedObjectType:null;
 if(!objectType||!['booking','studio','customer','settlement','media'].includes(objectType))return {};
 if(canReadCaseLinkedObject(actor,objectType))return content;
 return {objectType,restricted:true};
}

export async function GET(request:Request){
 try{
  const actor=await getProductionUser();
  if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'cases:read'))return response({error:'Cases authority is required.'},403);
  const db=database();
  const url=new URL(request.url);
  const requestedId=url.searchParams.get('case')||'';
  const status=url.searchParams.get('status')||'';
  const requestedCategory=url.searchParams.get('category')||'';
  const q=(url.searchParams.get('q')||'').trim().toLowerCase();
  const result=requestedId
   ?await db.prepare('SELECT * FROM operational_cases WHERE id=? OR reference=? LIMIT 1').bind(requestedId,requestedId).all()
   :await db.prepare("SELECT * FROM operational_cases ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,COALESCE(next_action_at,sla_target_at,'9999-12-31T23:59:59.999Z') ASC,updated_at DESC LIMIT 400").all();
  const canSeeCustomer=canReadCustomerField(actor,'reference');
  const canSeeBooking=canReadCaseLinkedObject(actor,'booking');
  const canSeeStudio=canReadCaseLinkedObject(actor,'studio');
  const canSeeSettlement=canReadCaseLinkedObject(actor,'settlement');
  const cases=(result.results as Record<string,unknown>[])
   .filter(row=>canReadCaseCategory(actor,caseCategory(row),caseClassification(row)))
   .map(row=>{const content=parse(row.content);return {
    id:String(row.id),reference:String(row.reference),category:String(row.category),severity:String(row.severity),priority:String(row.priority),status:String(row.status),source:String(row.source),
    assignedTo:row.assigned_to?String(row.assigned_to):null,assignedTeam:row.assigned_team?String(row.assigned_team):null,
    bookingId:row.booking_id&&canSeeBooking?String(row.booking_id):null,
    studioId:row.studio_id&&canSeeStudio?String(row.studio_id):null,
    customerRef:row.customer&&canSeeCustomer?maskedReference(row.customer):undefined,
    settlementId:row.settlement_id&&canSeeSettlement?String(row.settlement_id):null,
    classification:String(row.classification),slaTargetAt:row.sla_target_at?String(row.sla_target_at):null,nextActionAt:row.next_action_at?String(row.next_action_at):null,resolutionCode:row.resolution_code?String(row.resolution_code):null,
    createdAt:String(row.created_at),updatedAt:String(row.updated_at),resolvedAt:row.resolved_at?String(row.resolved_at):null,closedAt:row.closed_at?String(row.closed_at):null,revision:Number(row.revision||0),summary:String(content.summary||'Case'),description:String(content.description||''),
   }})
   .filter(item=>(!status||item.status===status)&&(!requestedCategory||item.category===requestedCategory)&&(!q||[item.reference,item.summary,item.bookingId||'',item.studioId||'',item.customerRef||'',item.settlementId||''].some(value=>String(value).toLowerCase().includes(q))));
  let events:any[]=[];
  let links:any[]=[];
  if(requestedId&&cases[0]){
   const caseId=cases[0].id;
   const eventRows=(await db.prepare('SELECT * FROM operational_case_events WHERE case_id=? ORDER BY created_at ASC,id ASC').bind(caseId).all()).results as Record<string,unknown>[];
   events=eventRows
    .filter(row=>!restricted(String(row.classification))||hasPermission(actor,'cases:restricted.read'))
    .map(row=>{const content=sanitizeEventContent(actor,String(row.event),parse(row.content));return {id:String(row.id),event:String(row.event),actor:maskedReference(row.actor),visibility:String(row.visibility),classification:String(row.classification),evidenceMediaId:row.evidence_media_id&&canReadCaseLinkedObject(actor,'media')?String(row.evidence_media_id):null,createdAt:String(row.created_at),content}});
   const linkRows=(await db.prepare('SELECT id,object_type,object_id,created_at FROM operational_case_links WHERE case_id=? ORDER BY created_at ASC').bind(caseId).all()).results as Record<string,unknown>[];
   links=linkRows
    .filter(row=>canReadCaseLinkedObject(actor,String(row.object_type) as CaseLinkedObjectType))
    .map(row=>({id:String(row.id),objectType:String(row.object_type),objectId:String(row.object_id),createdAt:String(row.created_at)}));
  }
  const metrics={open:cases.filter(item=>!['resolved','closed'].includes(item.status)).length,urgent:cases.filter(item=>item.priority==='urgent').length,critical:cases.filter(item=>item.severity==='critical').length,waiting:cases.filter(item=>item.status.startsWith('waiting_')).length};
  const canCreate=caseCategories.some(value=>canManageCaseCategory(actor,value));
  const canManage=cases[0]?canManageCaseCategory(actor,cases[0].category as CaseCategory):canCreate;
  return response({cases,events,links,metrics,canCreate,canManage,canAssign:canManage&&hasPermission(actor,'cases:assign'),canReadRestricted:hasPermission(actor,'cases:restricted.read'),generatedAt:new Date().toISOString()});
 }catch(error){
  console.error('Cases read failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Cases are temporarily unavailable.'},503);
 }
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>24_000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();
  if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'cases:manage'))return response({error:'Case management authority is required.'},403);
  const input=mutation.parse(await request.json());
  const db=database();
  const now=new Date().toISOString();
  const prior=await duplicate(db,actor.id,input.idempotencyKey);
  if(prior)return response({ok:true,duplicate:true,eventId:String(prior.id)});

  if(input.action==='create'){
   if(!canManageCaseCategory(actor,input.category))return response({error:'You cannot create cases in that operational category.'},403);
   if(restricted(input.classification)&&!hasPermission(actor,'cases:restricted.read'))return response({error:'Restricted case authority is required.'},403);
   for(const [type,value] of [['booking',input.bookingId],['studio',input.studioId],['customer',input.customer],['settlement',input.settlementId]] as const){
    if(!value)continue;
    if(!canReadCaseLinkedObject(actor,type))return response({error:`${type} authority is required before linking that record to a case.`},403);
    if(!(await assertObject(db,type,value)))return response({error:`Linked ${type} does not exist.`},409);
   }
   const caseId=newId('case');
   const reference=caseReference();
   const eventId=newId('caseevt');
   await db.batch([
    db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,assigned_to,assigned_team,booking_id,studio_id,customer,settlement_id,classification,sla_target_at,next_action_at,resolution_code,created_at,updated_at,resolved_at,closed_at,revision,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(caseId,reference,input.category,input.severity,input.priority,'open',input.source,actor.id,null,null,input.bookingId,input.studioId,input.customer,input.settlementId,input.classification,input.slaTargetAt,input.slaTargetAt,null,now,now,null,null,0,JSON.stringify({summary:input.summary,description:input.description})),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,caseId,actor.id,'case.created','internal',input.classification,null,input.idempotencyKey,now,JSON.stringify({summary:input.summary,description:input.description,source:input.source})),
    ...(input.bookingId?[
     db.prepare('INSERT OR IGNORE INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').bind(newId('caselink'),caseId,'booking',input.bookingId,actor.id,now),
     db.prepare('INSERT INTO booking_operation_events(id,booking_id,studio_id,actor,event,reason_code,case_id,idempotency_key,created_at,content) SELECT ?,b.id,b.studio_id,?,?,?,?,?,?,? FROM studio_bookings b WHERE b.id=?').bind(newId('bopevt'),actor.id,'case.linked',null,caseId,`case-link:${input.idempotencyKey}`,now,JSON.stringify({caseId,reference}),input.bookingId),
    ]:[]),
   ]);
   return response({ok:true,caseId,reference,eventId,revision:0},201);
  }

  const row=await loadCase(db,input.caseId);
  if(!row)return response({error:'Case not found.'},404);
  const categoryValue=caseCategory(row);
  const classificationValue=caseClassification(row);
  if(!canReadCaseCategory(actor,categoryValue,classificationValue)||!canManageCaseCategory(actor,categoryValue))return response({error:'You do not have authority for this case category.'},403);
  const currentRevision=Number(row.revision||0);
  const eventId=newId('caseevt');

  if(input.action==='note'){
   if(restricted(input.classification)&&!hasPermission(actor,'cases:restricted.read'))return response({error:'Restricted case authority is required.'},403);
   await db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'note.added',input.visibility,input.classification,null,input.idempotencyKey,now,JSON.stringify({note:input.note})).run();
   return response({ok:true,eventId,revision:currentRevision});
  }

  if(input.action==='link'){
   if(!canReadCaseLinkedObject(actor,input.objectType))return response({error:`${input.objectType} authority is required before linking that record to a case.`},403);
   if(!(await assertObject(db,input.objectType,input.objectId)))return response({error:`Linked ${input.objectType} does not exist.`},409);
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').bind(newId('caselink'),input.caseId,input.objectType,input.objectId,actor.id,now),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'object.linked','internal','internal',null,input.idempotencyKey,now,JSON.stringify({objectType:input.objectType,objectId:input.objectId})),
   ]);
   return response({ok:true,eventId,revision:currentRevision});
  }

  if(input.action==='evidence'){
   if(!hasPermission(actor,'cases:restricted.read'))return response({error:'Restricted evidence authority is required.'},403);
   const media=await db.prepare("SELECT id FROM uploads WHERE id=? AND owner=? AND purpose='case_evidence' AND case_id=? LIMIT 1").bind(input.mediaId,actor.id,input.caseId).first();
   if(!media)return response({error:'Evidence media must be a restricted upload created for this case by the current staff identity.'},403);
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').bind(newId('caselink'),input.caseId,'media',input.mediaId,actor.id,now),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'evidence.added','internal','restricted',input.mediaId,input.idempotencyKey,now,JSON.stringify({note:input.note})),
   ]);
   return response({ok:true,eventId,revision:currentRevision});
  }

  if(input.revision!==currentRevision)return response({error:'Case changed. Refresh before saving.',currentRevision},409);

  if(input.action==='assign'){
   if(!hasPermission(actor,'cases:assign'))return response({error:'Case assignment authority is required.'},403);
   if(input.assignedTo){
    const staff=await db.prepare("SELECT s.id FROM corporate_staff s LEFT JOIN corporate_staff_access_state a ON a.staff_id=s.id WHERE s.id=? AND s.status='active' AND COALESCE(a.status,'active')='active' LIMIT 1").bind(input.assignedTo).first();
    if(!staff)return response({error:'Assignee must be active staff.'},409);
   }
   const nextRevision=currentRevision+1;
   await db.batch([
    db.prepare('UPDATE operational_cases SET assigned_to=?,assigned_team=?,revision=?,updated_at=? WHERE id=? AND revision=?').bind(input.assignedTo,input.assignedTeam,nextRevision,now,input.caseId,currentRevision),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'assignment.changed','internal','internal',null,input.idempotencyKey,now,JSON.stringify({assignedTo:input.assignedTo,assignedTeam:input.assignedTeam,reason:input.reason,previousRevision:currentRevision,nextRevision})),
   ]);
   return response({ok:true,eventId,revision:nextRevision});
  }

  if(input.action==='setSla'){
   const nextRevision=currentRevision+1;
   await db.batch([
    db.prepare('UPDATE operational_cases SET sla_target_at=?,next_action_at=?,revision=?,updated_at=? WHERE id=? AND revision=?').bind(input.slaTargetAt,input.nextActionAt,nextRevision,now,input.caseId,currentRevision),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'sla.changed','internal','internal',null,input.idempotencyKey,now,JSON.stringify({slaTargetAt:input.slaTargetAt,nextActionAt:input.nextActionAt,reason:input.reason,previousRevision:currentRevision,nextRevision})),
   ]);
   return response({ok:true,eventId,revision:nextRevision});
  }

  if(input.action==='reopen'){
   const current=String(row.status) as CaseStatus;
   if(!['resolved','closed'].includes(current))return response({error:'Only a resolved or closed case can be reopened.'},409);
   const nextRevision=currentRevision+1;
   await db.batch([
    db.prepare("UPDATE operational_cases SET status='in_progress',resolution_code=NULL,resolved_at=NULL,closed_at=NULL,revision=?,updated_at=? WHERE id=? AND revision=?").bind(nextRevision,now,input.caseId,currentRevision),
    db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'case.reopened','internal','internal',null,input.idempotencyKey,now,JSON.stringify({reason:input.reason,from:current,to:'in_progress',previousRevision:currentRevision,nextRevision})),
   ]);
   return response({ok:true,eventId,status:'in_progress',revision:nextRevision});
  }

  const current=String(row.status) as CaseStatus;
  if(!canTransitionCase(current,input.to))return response({error:`Transition ${current} → ${input.to} is not allowed. Use the explicit reopen workflow for resolved/closed cases.`},409);
  if(requiresCaseResolution(input.to)&&!input.resolutionCode)return response({error:'Resolution code is required to resolve or close a case.'},400);
  const resolutionCode=input.to==='closed'?String(row.resolution_code||input.resolutionCode||''):input.to==='resolved'?input.resolutionCode||'':null;
  if(requiresCaseResolution(input.to)&&!resolutionCode)return response({error:'Resolution code is required.'},400);
  const nextRevision=currentRevision+1;
  const resolvedAt=input.to==='resolved'?now:input.to==='closed'?String(row.resolved_at||now):null;
  const closedAt=input.to==='closed'?now:null;
  await db.batch([
   db.prepare('UPDATE operational_cases SET status=?,resolution_code=?,resolved_at=?,closed_at=?,revision=?,updated_at=? WHERE id=? AND revision=?').bind(input.to,resolutionCode,resolvedAt,closedAt,nextRevision,now,input.caseId,currentRevision),
   db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.caseId,actor.id,'status.changed','internal','internal',null,input.idempotencyKey,now,JSON.stringify({from:current,to:input.to,reason:input.reason,resolutionCode:resolutionCode||null,previousRevision:currentRevision,nextRevision})),
  ]);
  return response({ok:true,eventId,status:input.to,revision:nextRevision});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid case request.'},400);
  console.error('Case mutation failed',error instanceof Error?error.message:'Unknown error');
  return response({error:'Case change could not be completed.'},503);
 }
}
