import {env} from 'cloudflare:workers';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import type {Studio} from '@/lib/registry';
import {bookingAccess} from '@/lib/booking-access';
import {canReadPrivateMedia,studioMembershipRole} from '@/lib/data-access-policy';

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const{id}=await params;
  if(!/^[0-9a-f-]{36}$/.test(id))return new Response('Not found',{status:404});
  const db=database();
  const row=await db.prepare('SELECT * FROM uploads WHERE id=?').bind(id).first();
  if(!row)return new Response('Not found',{status:404});
  let cache='private, no-store, max-age=0';
  if(row.purpose==='studio_room_photo'){
   const studioRow=await db.prepare('SELECT owner,content FROM studio_registry WHERE id=?').bind(row.studio_id).first();
   if(!studioRow)return new Response('Not found',{status:404});
   const studio:Studio=JSON.parse(studioRow.content);
   const referenced=studio.rooms.some(room=>room.id===row.room_id&&room.photos?.includes('/api/media/'+id));
   if(!referenced||studio.hidden||!studioRow.owner)return new Response('Not found',{status:404});
   cache='public, max-age=3600, stale-while-revalidate=86400';
  }else{
   const user=await getProductionUser();
   if(!user)return new Response('Sign in required',{status:401,headers:{'Cache-Control':'private, no-store, max-age=0'}});
   if(row.purpose==='studio_verification'){
    const studio=await db.prepare('SELECT owner FROM studio_registry WHERE id=?').bind(row.studio_id).first();
    const membership=studioMembershipRole(user,String(row.studio_id));
    const owner=studio?.owner===user.id&&(user.method==='chatgpt_demo'||membership==='owner');
    if(!canReadPrivateMedia(user,'studio_verification_evidence',{studioOwner:owner}))return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store, max-age=0'}});
   }else if(row.purpose==='settlement_proof'){
    const booking=await db.prepare('SELECT customer FROM studio_bookings WHERE id=? AND studio_id=?').bind(row.booking_id,row.studio_id).first();if(!booking)return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store, max-age=0'}});
    const studio=await db.prepare('SELECT owner FROM studio_registry WHERE id=?').bind(row.studio_id).first();
    const membership=studioMembershipRole(user,String(row.studio_id));const legacy=user.method==='chatgpt_demo';
    const contacts=[user.email?.toLowerCase(),user.phone].filter(Boolean);const staff=contacts.length?await db.prepare("SELECT role FROM studio_staff WHERE studio_id=? AND email IN (?,?) AND status='active'").bind(row.studio_id,contacts[0]||'',contacts[1]||'').first():null;
    const owner=studio?.owner===user.id&&(legacy||membership==='owner');
    const manager=staff?.role==='manager'&&(legacy||membership==='manager'||membership==='staff'||membership==='owner');
    if(!canReadPrivateMedia(user,'settlement_proof',{bookingCustomer:booking.customer===user.id,studioOwner:owner,studioManager:manager}))return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store, max-age=0'}});
   }else if(row.purpose==='booking_message_attachment'){
    const access=await bookingAccess(user,row.booking_id,row.studio_id);
    if(!access||!['requested','confirmed','completed'].includes(access.booking.status)||!canReadPrivateMedia(user,'booking_message_attachment',{bookingParticipantRole:access.role}))return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store, max-age=0'}});
   }else if(!canReadPrivateMedia(user,'private_upload',{uploadOwner:row.owner===user.id}))return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store, max-age=0'}});
  }
  const object=await (env as any).BUCKET.get(id);
  if(!object)return new Response('Not found',{status:404,headers:{'Cache-Control':cache}});
  const headers:{[key:string]:string}={'Content-Type':String(row.type),'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':cache};
  if(cache.includes('no-store'))headers.Pragma='no-cache';
  return new Response(object.body,{headers});
 }catch{return new Response('Media unavailable',{status:503,headers:{'Cache-Control':'private, no-store, max-age=0'}})}
}
