import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {hasPermission} from '@/lib/access-control';
import {canReadCustomerField} from '@/lib/data-access-policy';
import {bookingOperationStates,maskedReference} from '@/lib/phase5-operations';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
const id=z.string().trim().min(1).max(120);const iso=z.string().datetime({offset:true});
const mutation=z.discriminatedUnion('action',[
 z.object({action:z.literal('setState'),bookingId:id,state:z.enum(bookingOperationStates),reason:z.string().trim().min(3).max(1000),revision:z.number().int().min(0),idempotencyKey:id}),
 z.object({action:z.literal('setPriority'),bookingId:id,priority:z.enum(['low','normal','high','urgent']),reason:z.string().trim().min(3).max(1000),revision:z.number().int().min(0),idempotencyKey:id}),
 z.object({action:z.literal('assign'),bookingId:id,assignedTo:z.union([id,z.literal(''),z.null()]).optional(),assignedTeam:z.union([z.enum(['marketplace_operations','customer_support','provider_operations','trust_safety','finance']),z.literal(''),z.null()]).optional(),reason:z.string().trim().min(3).max(1000),revision:z.number().int().min(0),idempotencyKey:id}),
 z.object({action:z.literal('setSla'),bookingId:id,nextActionAt:z.union([iso,z.literal(''),z.null()]).optional(),slaState:z.enum(['on_track','due_soon','breached','paused','complete']),reason:z.string().trim().min(3).max(1000),revision:z.number().int().min(0),idempotencyKey:id}),
 z.object({action:z.literal('addNote'),bookingId:id,note:z.string().trim().min(2).max(4000),reasonCode:z.string().trim().max(80).optional(),idempotencyKey:id}),
]);
const parse=(value:unknown)=>{try{return JSON.parse(String(value||'{}'))}catch{return {}}};
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;

export async function GET(request:Request){
 try{
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'bookings:read'))return response({error:'Booking operations authority is required.'},403);
  const url=new URL(request.url);const state=url.searchParams.get('state')||'';const priority=url.searchParams.get('priority')||'';const query=(url.searchParams.get('q')||'').trim().toLowerCase();const db=database();
  const result=await db.prepare(`SELECT b.id,b.studio_id,b.customer,b.content,
    o.operational_state,o.priority,o.assigned_to,o.assigned_team,o.next_action_at,o.sla_state,o.revision,o.updated_at,
    (SELECT count(*) FROM operational_cases c WHERE c.booking_id=b.id AND c.status NOT IN ('resolved','closed')) open_cases,
    (SELECT status FROM studio_settlements s WHERE s.booking_id=b.id LIMIT 1) settlement_status
    FROM studio_bookings b LEFT JOIN booking_operation_state o ON o.booking_id=b.id
    ORDER BY COALESCE(o.next_action_at,'9999-12-31T23:59:59.999Z') ASC,b.rowid DESC LIMIT 300`).all();
  const showCustomer=canReadCustomerField(actor,'reference');
  const rows=(result.results as Record<string,unknown>[]).map(row=>{const booking=parse(row.content);return {
   bookingId:String(row.id),studioId:String(row.studio_id),customerRef:showCustomer?maskedReference(row.customer):undefined,
   room:String(booking.roomName||'—'),bookingStatus:String(booking.status||'unknown'),date:String(booking.date||'—'),start:Number(booking.start||0),duration:Number(booking.duration||0),createdAt:String(booking.createdAt||''),
   operationalState:String(row.operational_state||'normal'),priority:String(row.priority||'normal'),assignedTo:row.assigned_to?String(row.assigned_to):null,assignedTeam:row.assigned_team?String(row.assigned_team):null,nextActionAt:row.next_action_at?String(row.next_action_at):null,slaState:String(row.sla_state||'on_track'),revision:Number(row.revision||0),updatedAt:row.updated_at?String(row.updated_at):null,
   openCases:Number(row.open_cases||0),settlementStatus:row.settlement_status?String(row.settlement_status):null,
  }}).filter(row=>(!state||row.operationalState===state)&&(!priority||row.priority===priority)&&(!query||[row.bookingId,row.studioId,row.room,row.bookingStatus,row.customerRef||''].some(value=>String(value).toLowerCase().includes(query))));
  const metrics={total:rows.length,attention:rows.filter(row=>['attention','intervention'].includes(row.operationalState)).length,urgent:rows.filter(row=>row.priority==='urgent').length,slaBreached:rows.filter(row=>row.slaState==='breached').length,unassigned:rows.filter(row=>!row.assignedTo&&!row.assignedTeam).length};
  return response({rows,metrics,canManage:hasPermission(actor,'bookings:manage'),customerReferencesVisible:showCustomer,canonicalSource:'studio_bookings',generatedAt:new Date().toISOString()});
 }catch(error){console.error('Booking operations read failed',error instanceof Error?error.message:'Unknown error');return response({error:'Booking operations are temporarily unavailable.'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>20_000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();if(!actor)return response({error:'Sign in required.'},401);
  if(!hasPermission(actor,'bookings:manage'))return response({error:'Booking operations management authority is required.'},403);
  const input=mutation.parse(await request.json());const db=database();const now=new Date().toISOString();
  const booking=await db.prepare('SELECT id,studio_id FROM studio_bookings WHERE id=? LIMIT 1').bind(input.bookingId).first();if(!booking)return response({error:'Canonical booking not found.'},404);
  const existingEvent=await db.prepare('SELECT id FROM booking_operation_events WHERE actor=? AND idempotency_key=? LIMIT 1').bind(actor.id,input.idempotencyKey).first();if(existingEvent)return response({ok:true,duplicate:true,eventId:String(existingEvent.id)});
  if(input.action==='addNote'){
   const eventId=newId('bopevt');await db.prepare('INSERT INTO booking_operation_events(id,booking_id,studio_id,actor,event,reason_code,case_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.bookingId,String(booking.studio_id),actor.id,'note.added',input.reasonCode||null,null,input.idempotencyKey,now,JSON.stringify({note:input.note})).run();
   return response({ok:true,eventId,bookingId:input.bookingId});
  }
  const current=await db.prepare('SELECT * FROM booking_operation_state WHERE booking_id=?').bind(input.bookingId).first();const currentRevision=Number(current?.revision||0);
  if(input.revision!==currentRevision)return response({error:'Booking operations state changed. Refresh before saving.',currentRevision},409);
  const next={
   state:String(current?.operational_state||'normal'),priority:String(current?.priority||'normal'),assignedTo:current?.assigned_to?String(current.assigned_to):null,assignedTeam:current?.assigned_team?String(current.assigned_team):null,nextActionAt:current?.next_action_at?String(current.next_action_at):null,slaState:String(current?.sla_state||'on_track'),
  };
  let event='';let reason='';
  if(input.action==='setState'){next.state=input.state;event='state.changed';reason=input.reason}
  else if(input.action==='setPriority'){next.priority=input.priority;event='priority.changed';reason=input.reason}
  else if(input.action==='assign'){
   if(input.assignedTo){const staff=await db.prepare("SELECT s.id FROM corporate_staff s LEFT JOIN corporate_staff_access_state a ON a.staff_id=s.id WHERE s.id=? AND s.status='active' AND COALESCE(a.status,'active')='active' LIMIT 1").bind(input.assignedTo).first();if(!staff)return response({error:'Assignee must be an active Sessions staff member.'},409)}
   next.assignedTo=input.assignedTo||null;next.assignedTeam=input.assignedTeam||null;event='assignment.changed';reason=input.reason;
  }else{next.nextActionAt=input.nextActionAt||null;next.slaState=input.slaState;event='sla.changed';reason=input.reason}
  const nextRevision=currentRevision+1;const eventId=newId('bopevt');
  await db.batch([
   db.prepare(`INSERT INTO booking_operation_state(booking_id,studio_id,operational_state,priority,assigned_to,assigned_team,next_action_at,sla_state,revision,updated_at,content)
    VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET studio_id=excluded.studio_id,operational_state=excluded.operational_state,priority=excluded.priority,assigned_to=excluded.assigned_to,assigned_team=excluded.assigned_team,next_action_at=excluded.next_action_at,sla_state=excluded.sla_state,revision=excluded.revision,updated_at=excluded.updated_at,content=excluded.content`).bind(input.bookingId,String(booking.studio_id),next.state,next.priority,next.assignedTo,next.assignedTeam,next.nextActionAt,next.slaState,nextRevision,now,'{}'),
   db.prepare('INSERT INTO booking_operation_events(id,booking_id,studio_id,actor,event,reason_code,case_id,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(eventId,input.bookingId,String(booking.studio_id),actor.id,event,null,null,input.idempotencyKey,now,JSON.stringify({reason,previousRevision:currentRevision,nextRevision,state:next})),
  ]);
  return response({ok:true,bookingId:input.bookingId,eventId,revision:nextRevision,state:next});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid booking operations request.'},400);
  console.error('Booking operations mutation failed',error instanceof Error?error.message:'Unknown error');return response({error:'Booking operations change could not be completed.'},503);
 }
}
