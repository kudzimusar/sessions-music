import {z} from 'zod';
import {database} from '@/db/store';
import {seedRegistry} from '@/db/registry-store';
import {resolveFeePolicy} from '@/lib/commerce-server';
import {quoteRoomBooking} from '@/lib/booking-quote';
import type {Studio} from '@/lib/registry';

const text=z.string().trim();
const requestSchema=z.object({studioId:text.min(1).max(100),roomId:text.min(1).max(100),date:text.regex(/^\d{4}-\d{2}-\d{2}$/),duration:z.number().int().min(30).max(480).multipleOf(30),addOns:z.array(z.object({id:text.min(1).max(100),quantity:z.number().int().min(1).max(12)})).max(12).default([]),clientKey:text.uuid().optional()});
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req:Request){
 try{
  const origin=req.headers.get('Origin');if(origin&&origin!==new URL(req.url).origin)return response({error:'Cross-origin request rejected'},403);
  if(Number(req.headers.get('content-length')||0)>8000)return response({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>8000)return response({error:'Request too large'},413);
  const input=requestSchema.parse(JSON.parse(raw));await seedRegistry();
  const row=await database().prepare('SELECT content FROM studio_registry WHERE id=?').bind(input.studioId).first();if(!row)return response({error:'Studio not found'},404);
  const studio=JSON.parse(row.content) as Studio;if(studio.hidden||!studio.bookingEnabled||studio.status!=='bookable')return response({error:'This studio is not accepting booking requests'},409);
  const room=studio.rooms.find(value=>value.id===input.roomId);if(!room)return response({error:'Room not found'},404);
  const policy=await resolveFeePolicy(studio.id,room.id,input.date);const quote=quoteRoomBooking(room,input.duration,input.addOns,policy);
  return response({ok:true,clientKey:input.clientKey||null,quote:{...quote,policyId:policy.id,effectiveFrom:policy.effectiveFrom}});
 }catch(error){const message=error instanceof z.ZodError?error.issues.map(issue=>`${issue.path.join('.')}: ${issue.message}`).join('; '):error instanceof Error?error.message:'Unable to calculate a quote';return response({error:message},400)}
}
