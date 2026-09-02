import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {readRegistry} from '@/db/registry-store';
import {platformCalendarConfiguration,syncPlatformCalendar} from '@/lib/google-calendar-server';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

async function managed(studioId:string){
 const user=await getChatGPTUser();if(!user)throw Object.assign(new Error('Sign in with ChatGPT to continue'),{status:401});
 const state=await readRegistry(user);if(!state.managedIds.includes(studioId))throw Object.assign(new Error('Studio manager access required'),{status:403});
 const studio=state.studios.find(value=>value.id===studioId);if(!studio)throw Object.assign(new Error('Studio not found'),{status:404});
 return {state,studio};
}

export async function GET(request:Request){
 try{
  const studioId=z.string().trim().min(1).max(100).parse(new URL(request.url).searchParams.get('studio')),{studio}=await managed(studioId),db=database();
  const rows=(await db.prepare('SELECT booking_id,status,updated_at FROM studio_calendar_events WHERE studio_id=? ORDER BY updated_at DESC LIMIT 500').bind(studio.id).all()).results as Array<{booking_id:string;status:string;updated_at:string}>;
  return response({configuration:platformCalendarConfiguration(),counts:{synced:rows.filter(r=>r.status==='synced').length,pending:rows.filter(r=>r.status==='awaiting_setup').length,failed:rows.filter(r=>r.status==='failed').length},failedBookingIds:rows.filter(r=>r.status==='failed').slice(0,20).map(r=>r.booking_id)});
 }catch(error){if(error instanceof z.ZodError)return response({error:'Choose a studio'},400);const e=error as Error&{status?:number};return response({error:e.message||'Calendar status unavailable'},e.status||503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected'},403);
  if(Number(request.headers.get('content-length')||0)>2000)return response({error:'Request too large'},413);
  const input=z.object({studioId:z.string().trim().min(1).max(100),bookingId:z.string().trim().min(1).max(100)}).parse(await request.json()),{state,studio}=await managed(input.studioId);
  const booking=state.bookings.find(value=>value.id===input.bookingId&&value.studioId===studio.id);if(!booking)return response({error:'Booking not found'},404);
  if(!['confirmed','cancelled','completed'].includes(booking.status))return response({error:'Only accepted, cancelled or completed bookings sync to the platform calendar'},409);
  return response(await syncPlatformCalendar(studio,booking));
 }catch(error){if(error instanceof z.ZodError)return response({error:'Invalid calendar sync request'},400);const e=error as Error&{status?:number};return response({error:e.message||'Calendar sync unavailable'},e.status||503)}
}
