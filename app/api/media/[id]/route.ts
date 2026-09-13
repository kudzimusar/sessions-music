import {env} from 'cloudflare:workers';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import type {Studio} from '@/lib/registry';
import {bookingAccess} from '@/lib/booking-access';
import {canReadCaseCategory,canReadPrivateMedia,studioMembershipRole,type CaseCategory,type DataClassification} from '@/lib/data-access-policy';

const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'};

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
   const studio:Studio=JSON.parse(String(studioRow.content||'{}'));
   const referenced=studio.rooms.some(room=>room.id===row.room_id&&room.photos?.includes('/api/media/'+id));
   if(!referenced||studio.hidden||!studioRow.owner)return new Response('Not found',{status:404});
   cache='public, max-age=3600, stale-while-revalidate=86400';
  }else{
   const user=await getProductionUser();
   if(!user)return new Response('Sign in required',{status:401,headers:privateHeaders});
   if(row.purpose==='studio_verification'){
    const studio=await db.prepare('SELECT owner FROM studio_registry WHERE id=?').bind(row.studio_id).first();
    const membership=studioMembershipRole(user,String(row.studio_id));
    const owner=studio?.owner===user.id&&(user.method==='chatgpt_demo'||membership==='owner');
    if(!canReadPrivateMedia(user,'studio_verification_evidence',{studioOwner:owner}))return new Response('Not found',{status:404,headers:privateHeaders});
   }else if(row.purpose==='settlement_proof'){
    const booking=await db.prepare('SELECT customer FROM studio_bookings WHERE id=? AND studio_id=?').bind(row.booking_id,row.studio_id).first();
    if(!booking)return new Response('Not found',{status:404,headers:privateHeaders});
    const studio=await db.prepare('SELECT owner FROM studio_registry WHERE id=?').bind(row.studio_id).first();
    const membership=studioMembershipRole(user,String(row.studio_id));
    const legacy=user.method==='chatgpt_demo';
    const contacts=[user.email?.toLowerCase(),user.phone].filter(Boolean);
    const staff=contacts.length?await db.prepare("SELECT role FROM studio_staff WHERE studio_id=? AND email IN (?,?) AND status='active'").bind(row.studio_id,contacts[0]||'',contacts[1]||'').first():null;
    const owner=studio?.owner===user.id&&(legacy||membership==='owner');
    const manager=staff?.role==='manager'&&(legacy||membership==='manager'||membership==='staff'||membership==='owner');
    if(!canReadPrivateMedia(user,'settlement_proof',{bookingCustomer:booking.customer===user.id,studioOwner:owner,studioManager:manager}))return new Response('Not found',{status:404,headers:privateHeaders});
   }else if(row.purpose==='booking_message_attachment'){
    const access=await bookingAccess(user,row.booking_id,row.studio_id);
    if(!access||!['requested','confirmed','completed'].includes(access.booking.status)||!canReadPrivateMedia(user,'booking_message_attachment',{bookingParticipantRole:access.role}))return new Response('Not found',{status:404,headers:privateHeaders});
   }else if(row.purpose==='case_evidence'){
    let caseId=row.case_id?String(row.case_id):'';
    if(!caseId){
     const link=await db.prepare("SELECT case_id FROM operational_case_links WHERE object_type='media' AND object_id=? ORDER BY created_at ASC LIMIT 1").bind(id).first();
     caseId=link?.case_id?String(link.case_id):'';
    }
    if(!caseId)return new Response('Not found',{status:404,headers:privateHeaders});
    const caseRow=await db.prepare('SELECT category,classification FROM operational_cases WHERE id=? LIMIT 1').bind(caseId).first();
    const caseAuthorized=!!caseRow&&canReadCaseCategory(user,String(caseRow.category) as CaseCategory,String(caseRow.classification) as DataClassification);
    if(!canReadPrivateMedia(user,'case_evidence',{caseAuthorized}))return new Response('Not found',{status:404,headers:privateHeaders});
   }else if(!canReadPrivateMedia(user,'private_upload',{uploadOwner:row.owner===user.id}))return new Response('Not found',{status:404,headers:privateHeaders});
  }
  const object=await (env as any).BUCKET.get(id);
  if(!object)return new Response('Not found',{status:404,headers:{'Cache-Control':cache}});
  const headers:{[key:string]:string}={'Content-Type':String(row.type),'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':cache};
  if(cache.includes('no-store'))headers.Pragma='no-cache';
  return new Response(object.body,{headers});
 }catch(error){
  console.error('Media read failed',error instanceof Error?error.message:'Unknown error');
  return new Response('Media unavailable',{status:503,headers:privateHeaders});
 }
}
