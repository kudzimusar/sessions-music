import {getProductionUser,type SessionUser} from '@/app/chatgpt-auth';
import {bookingAccess} from '@/lib/booking-access';
import {bookingIcs} from '@/lib/booking-communications';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const user=await getProductionUser();if(!user)return Response.json({error:'Sign in to download this calendar file'},{status:401});const {id}=await params;const access=await bookingAccess(user as SessionUser,id);if(!access||access.role==='operations')return Response.json({error:'This booking belongs to another account'},{status:403});if(!['confirmed','completed'].includes(access.booking.status))return Response.json({error:'A calendar file is available after the studio confirms the booking'},{status:409});
  const origin=new URL(request.url).origin,body=bookingIcs(access.studio,access.booking,origin);return new Response(body,{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':`attachment; filename="sessions-${access.booking.id}.ics"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){console.error('Calendar artifact unavailable',error);return Response.json({error:'Calendar file unavailable'},{status:503});}
}
