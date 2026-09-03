import {getProductionUser} from '@/app/chatgpt-auth';
import {readRegistry} from '@/db/registry-store';

export async function GET(){
 try{
  const user=await getProductionUser();if(!user)return Response.json({error:'Sign in first'},{status:401});const state=await readRegistry(user);const vouchers=new Map((state.vouchers||[]).map(value=>[value.bookingId,value]));
  const bookings=state.bookings.filter(value=>value.customer===user.id&&['confirmed','completed'].includes(value.status)).map(value=>({id:value.id,studioId:value.studioId,studioName:state.studios.find(studio=>studio.id===value.studioId)?.name||'Studio',roomName:value.roomName,date:value.date,start:value.start,duration:value.duration,status:value.status,voucher:vouchers.get(value.id)?{token:vouchers.get(value.id)!.token,reference:vouchers.get(value.id)!.reference}:null}));
  return Response.json({accountId:user.id,generatedAt:new Date().toISOString(),bookings,notice:'Offline reference only. Connect to Sessions to confirm the live booking, payment and studio details.'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Offline booking reference unavailable',error);return Response.json({error:'Offline booking reference unavailable'},{status:503});}
}
