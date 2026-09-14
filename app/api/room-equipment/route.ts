import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {PLANNER_EQUIPMENT,type PlannerEquipment,type RoomEquipmentMap} from '@/lib/discovery';
import type {Studio} from '@/lib/registry';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const equipmentSchema=z.array(z.enum(PLANNER_EQUIPMENT)).max(PLANNER_EQUIPMENT.length).transform(values=>[...new Set(values)] as PlannerEquipment[]);
const requestSchema=z.object({studioId:z.string().trim().min(1).max(100),roomId:z.string().trim().min(1).max(100),revision:z.number().int().min(0),equipment:equipmentSchema});
type StudioWithEquipment=Studio&{roomEquipment?:RoomEquipmentMap};

async function ownerContext(studioId:string){
 const user=await getProductionUser();if(!user)return {error:response({error:'Sign in to Sessions to continue'},401)} as const;
 const db=database();const row=await db.prepare('SELECT owner,revision,content FROM studio_registry WHERE id=?').bind(studioId).first();
 if(!row)return {error:response({error:'Studio not found'},404)} as const;
 const membership=user.memberships.find(value=>value.organizationId===studioId&&value.active);
 const owner=row.owner===user.id&&(user.method==='chatgpt_demo'||membership?.role==='owner');
 if(!owner)return {error:response({error:'Only the verified studio owner can manage room equipment'},403)} as const;
 return {user,db,row,studio:{...JSON.parse(String(row.content)),revision:Number(row.revision)} as StudioWithEquipment} as const;
}

export async function GET(req:Request){
 try{
  const studioId=new URL(req.url).searchParams.get('studio')||'';if(!studioId)return response({error:'Studio is required'},400);
  const context=await ownerContext(studioId);if('error'in context)return context.error;
  return response({studioId,revision:context.studio.revision,rooms:context.studio.rooms.map(room=>({id:room.id,name:room.name,equipment:context.studio.roomEquipment?.[room.id]||[]})),vocabulary:PLANNER_EQUIPMENT});
 }catch(error){console.error('Room equipment load failed',error instanceof Error?error.message:'Unknown error');return response({error:'Unable to load room equipment'},503)}
}

export async function POST(req:Request){
 try{
  const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)return response({error:'Cross-origin request rejected'},403);
  if(Number(req.headers.get('content-length')||0)>8000)return response({error:'Request too large'},413);
  const body=requestSchema.parse(await req.json());const context=await ownerContext(body.studioId);if('error'in context)return context.error;
  if(context.studio.revision!==body.revision)return response({error:'This studio changed. Refresh and try again.'},409);
  if(!context.studio.rooms.some(room=>room.id===body.roomId))return response({error:'Room not found'},404);
  const roomEquipment:RoomEquipmentMap={...(context.studio.roomEquipment||{})};
  if(body.equipment.length)roomEquipment[body.roomId]=body.equipment;else delete roomEquipment[body.roomId];
  const next={...context.studio,roomEquipment,updatedAt:new Date().toISOString()};delete (next as {revision?:number}).revision;
  const guard=crypto.randomUUID(),now=new Date().toISOString();
  await context.db.batch([
   context.db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN revision=? THEN 1 ELSE 0 END FROM studio_registry WHERE id=?))').bind(guard,body.revision,body.studioId),
   context.db.prepare('UPDATE studio_registry SET content=?,revision=revision+1 WHERE id=?').bind(JSON.stringify(next),body.studioId),
   context.db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),body.studioId,context.user.id,`room equipment updated:${body.roomId}`,now),
   context.db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard),
  ]);
  return response({ok:true,studioId:body.studioId,roomId:body.roomId,equipment:body.equipment,revision:body.revision+1});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; ')},400);
  if(error instanceof Error&&/UNIQUE|CHECK|constraint/i.test(error.message))return response({error:'This studio changed. Refresh and try again.'},409);
  console.error('Room equipment update failed',error instanceof Error?error.message:'Unknown error');return response({error:'Unable to save room equipment'},503);
 }
}
