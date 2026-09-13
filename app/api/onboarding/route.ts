import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {normalizeZimbabwePhone} from '@/lib/identity-core';
import {consumeContinuationIntent} from '@/lib/continuation';
import {REQUIRED_CONSENTS,readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const now=()=>new Date().toISOString();
const channel=z.enum(['web','pwa','ios','android']).default('web');
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('completeProfile'),displayName:z.string().trim().min(2).max(100),market:z.literal('ZW').default('ZW'),locale:z.enum(['en-ZW','sn-ZW','nd-ZW']).default('en-ZW')}),
 z.object({action:z.literal('recordConsent'),consentType:z.enum(['terms','privacy','marketing']),granted:z.boolean(),idempotencyKey:z.string().min(8).max(120),channel}),
 z.object({action:z.literal('setIntention'),journey:z.enum(['customer','provider','corporate'])}),
 z.object({action:z.literal('acceptCorporateInvitation'),staffId:z.string().min(1).max(160),idempotencyKey:z.string().min(8).max(120),channel}),
 z.object({action:z.literal('completeCorporateSecuritySetup'),staffId:z.string().min(1).max(160)}),
 z.object({action:z.literal('setWhatsAppPreference'),phone:z.string().min(7).max(30),optedIn:z.boolean(),idempotencyKey:z.string().min(8).max(120),channel}),
 z.object({action:z.literal('setLastContext'),contextType:z.enum(['personal','provider','corporate']),contextId:z.string().min(1).max(160)}),
 z.object({action:z.literal('consumeContinuation'),token:z.string().min(20).max(180)}),
]);

type Row=Record<string,unknown>;
async function corporateStaff(db:any,userId:string,staffId:string){
 return await db.prepare("SELECT s.id,s.status,s.started_at,s.content,COALESCE(a.status,'active') access_status FROM corporate_staff s LEFT JOIN corporate_staff_access_state a ON a.staff_id=s.id WHERE s.id=? AND s.user_id=? LIMIT 1").bind(staffId,userId).first() as Row|undefined;
}

export async function GET(){
 try{const actor=await getProductionUser();if(!actor)return response({error:'Sessions sign-in required.'},401);return response(await readOnboardingSnapshot(actor))}
 catch(error){console.error('Onboarding read failed',error instanceof Error?error.message:'Unknown error');return response({error:'Onboarding is temporarily unavailable.'},503)}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'Cross-origin request rejected.'},403);
  if(Number(request.headers.get('content-length')||0)>16_000)return response({error:'Request too large.'},413);
  const actor=await getProductionUser();if(!actor)return response({error:'Sessions sign-in required.'},401);
  const body=input.parse(await request.json());const db=database();const at=now();
  await readOnboardingSnapshot(actor);

  if(body.action==='completeProfile'){
   await db.batch([
    db.prepare("UPDATE sessions_user_profiles SET display_name=?,market=?,locale=?,status=CASE WHEN status IN ('profile_required','identity_verified') THEN 'consent_required' ELSE status END,updated_at=? WHERE user_id=?").bind(body.displayName,body.market,body.locale,at,actor.id),
    db.prepare("UPDATE sessions_onboarding_journeys SET status='consent_required',current_step='consent',revision=revision+1,updated_at=? WHERE user_id=? AND journey='customer' AND status IN ('profile_required','identity_verified')").bind(at,actor.id),
    db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('life'),actor.id,actor.id,'profile.completed','customer',at,JSON.stringify({market:body.market,locale:body.locale})),
   ]);
  }else if(body.action==='recordConsent'){
   const version=body.consentType==='terms'?REQUIRED_CONSENTS.terms:body.consentType==='privacy'?REQUIRED_CONSENTS.privacy:'marketing-v1';
   await db.prepare('INSERT OR IGNORE INTO sessions_consents(id,user_id,consent_type,document_version,decision,channel,source,idempotency_key,occurred_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(newId('consent'),actor.id,body.consentType,version,body.granted?'granted':'declined',body.channel,'onboarding',body.idempotencyKey,at,'{}').run();
   const snapshot=await readOnboardingSnapshot(actor);
   if(snapshot.profile.displayName&&snapshot.consents.terms&&snapshot.consents.privacy){
    await db.batch([
     db.prepare("UPDATE sessions_user_profiles SET status=CASE WHEN status='consent_required' THEN 'active' ELSE status END,updated_at=? WHERE user_id=?").bind(at,actor.id),
     db.prepare("UPDATE sessions_onboarding_journeys SET status='active',current_step='complete',completed_at=COALESCE(completed_at,?),revision=revision+1,updated_at=? WHERE user_id=? AND journey='customer' AND status='consent_required'").bind(at,at,actor.id),
     db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('life'),actor.id,actor.id,'customer.activated','customer',at,'{}'),
    ]);
   }
  }else if(body.action==='setIntention'){
   if(body.journey==='provider'){
    await db.prepare("INSERT INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,revision,started_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,journey,context_key) DO UPDATE SET updated_at=excluded.updated_at,current_step=CASE WHEN sessions_onboarding_journeys.status IN ('rejected','terminated') THEN sessions_onboarding_journeys.current_step ELSE 'find_studio' END").bind(newId('journey'),actor.id,'provider','','draft','find_studio',0,at,at,'{}').run();
   }else if(body.journey==='corporate'){
    const staff=await db.prepare("SELECT s.id,s.status,COALESCE(a.status,'active') access_status FROM corporate_staff s LEFT JOIN corporate_staff_access_state a ON a.staff_id=s.id WHERE s.user_id=? AND s.status IN ('invited','active') ORDER BY s.updated_at DESC LIMIT 1").bind(actor.id).first();
    if(!staff)return response({error:'Corporate access is invitation-only. No Sessions staff invitation matches this identity.'},403);
    if(String(staff.access_status)!=='active')return response({error:'This corporate staff context is not active. Contact Sessions administration.'},403);
    const desiredStatus=String(staff.status)==='active'?'security_setup_required':'invited';
    const desiredStep=desiredStatus==='invited'?'accept_invitation':'security_setup';
    await db.prepare("INSERT INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,revision,started_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,journey,context_key) DO UPDATE SET status=CASE WHEN sessions_onboarding_journeys.status='active' THEN 'active' ELSE excluded.status END,current_step=CASE WHEN sessions_onboarding_journeys.status='active' THEN 'complete' ELSE excluded.current_step END,revision=sessions_onboarding_journeys.revision+1,updated_at=excluded.updated_at").bind(newId('journey'),actor.id,'corporate',String(staff.id),desiredStatus,desiredStep,0,at,at,'{}').run();
   }else await db.prepare("UPDATE sessions_onboarding_journeys SET updated_at=? WHERE user_id=? AND journey='customer'").bind(at,actor.id).run();
  }else if(body.action==='acceptCorporateInvitation'){
   const staff=await corporateStaff(db,actor.id,body.staffId);
   if(!staff||!['invited','active'].includes(String(staff.status)))return response({error:'This staff invitation is unavailable or belongs to another identity.'},403);
   if(String(staff.access_status)!=='active')return response({error:'This corporate staff context has been suspended or ended.'},403);
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO sessions_consents(id,user_id,consent_type,document_version,decision,channel,source,idempotency_key,occurred_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(newId('consent'),actor.id,'corporate_access',REQUIRED_CONSENTS.corporateAccess,'granted',body.channel,'corporate_onboarding',body.idempotencyKey,at,JSON.stringify({staffId:body.staffId})),
    db.prepare("INSERT INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,revision,started_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,journey,context_key) DO UPDATE SET status='security_setup_required',current_step='security_setup',revision=sessions_onboarding_journeys.revision+1,updated_at=excluded.updated_at").bind(newId('journey'),actor.id,'corporate',body.staffId,'security_setup_required','security_setup',0,at,at,'{}'),
    db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,context_id,reason_code,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(newId('life'),actor.id,actor.id,String(staff.status)==='invited'?'corporate.invitation_accepted':'corporate.access_policy_accepted','corporate',body.staffId,'self_verified',at,'{}'),
   ]);
  }else if(body.action==='completeCorporateSecuritySetup'){
   if(!actor.deviceRegistered)return response({error:'Register this authenticated device/session before completing corporate security setup.'},409);
   const staff=await corporateStaff(db,actor.id,body.staffId);
   if(!staff||!['invited','active'].includes(String(staff.status)))return response({error:'This staff invitation is unavailable or belongs to another identity.'},403);
   if(String(staff.access_status)!=='active')return response({error:'This corporate staff context has been suspended or ended.'},403);
   const snapshot=await readOnboardingSnapshot(actor);
   if(!snapshot.consents.corporateAccess)return response({error:'Accept the versioned Sessions corporate access policy before completing security setup.'},409);
   const journey=await db.prepare("SELECT status FROM sessions_onboarding_journeys WHERE user_id=? AND journey='corporate' AND context_key=? LIMIT 1").bind(actor.id,body.staffId).first();
   if(!journey||!['accepted','security_setup_required','active'].includes(String(journey.status)))return response({error:'Accept the corporate invitation before completing security setup.'},409);
   if(String(journey.status)!=='active'){
    await db.batch([
     db.prepare("UPDATE corporate_staff SET status='active',started_at=COALESCE(started_at,json_extract(content,'$.plannedStartAt'),?),updated_at=? WHERE id=? AND user_id=? AND status IN ('invited','active')").bind(at.slice(0,10),at,body.staffId,actor.id),
     db.prepare("INSERT INTO corporate_staff_access_state(staff_id,user_id,status,reason_code,reason,effective_at,updated_by,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(staff_id) DO UPDATE SET status=CASE WHEN corporate_staff_access_state.status='active' THEN 'active' ELSE corporate_staff_access_state.status END,updated_at=CASE WHEN corporate_staff_access_state.status='active' THEN excluded.updated_at ELSE corporate_staff_access_state.updated_at END").bind(body.staffId,actor.id,'active',null,null,at,actor.id,at,'{}'),
     db.prepare("UPDATE sessions_onboarding_journeys SET status='active',current_step='complete',completed_at=COALESCE(completed_at,?),revision=revision+1,updated_at=? WHERE user_id=? AND journey='corporate' AND context_key=? AND status IN ('accepted','security_setup_required')").bind(at,at,actor.id,body.staffId),
     db.prepare('INSERT INTO corporate_org_events(id,actor,event,entity_type,entity_id,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(newId('orgevt'),actor.id,'staff.onboarding_activated','staff',body.staffId,at,JSON.stringify({deviceRegistered:true})),
     db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,context_id,reason_code,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(newId('life'),actor.id,actor.id,'corporate.security_setup_completed','corporate',body.staffId,'device_registered',at,'{}'),
    ]);
   }
  }else if(body.action==='setWhatsAppPreference'){
   const phone=normalizeZimbabwePhone(body.phone);
   if(!actor.phone||normalizeZimbabwePhone(actor.phone)!==phone)return response({error:'WhatsApp can only be enabled for the verified phone on your Sessions identity.'},409);
   const existing=await db.prepare("SELECT id FROM sessions_user_contacts WHERE user_id=? AND kind='whatsapp' AND value=? LIMIT 1").bind(actor.id,phone).first();
   if(existing)await db.prepare('UPDATE sessions_user_contacts SET consent_status=?,verified_at=?,updated_at=? WHERE id=?').bind(body.optedIn?'opted_in':'opted_out',at,at,String(existing.id)).run();
   else await db.prepare('INSERT INTO sessions_user_contacts(id,user_id,kind,value,is_primary,verified_at,source,consent_status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(newId('contact'),actor.id,'whatsapp',phone,0,at,'user',body.optedIn?'opted_in':'opted_out',at,at,'{}').run();
   await db.prepare('INSERT OR IGNORE INTO sessions_consents(id,user_id,consent_type,document_version,decision,channel,source,idempotency_key,occurred_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(newId('consent'),actor.id,'whatsapp','whatsapp-v1',body.optedIn?'granted':'withdrawn',body.channel,'settings',body.idempotencyKey,at,'{}').run();
  }else if(body.action==='consumeContinuation'){
   const continuation=await consumeContinuationIntent(body.token,actor.id);if(!continuation)return response({error:'That continuation link has expired, was already used, or belongs to another identity.'},409);
   return response({...await readOnboardingSnapshot(actor),returnPath:continuation.returnPath,continuationConsumed:true});
  }else{
   const snapshot=await readOnboardingSnapshot(actor);const allowed=snapshot.contexts.some(context=>context.type===body.contextType&&context.id===body.contextId&&context.status==='active');
   if(!allowed)return response({error:'That workspace is not currently authorized for this identity.'},403);
   await db.prepare('UPDATE sessions_user_profiles SET last_context_type=?,last_context_id=?,updated_at=? WHERE user_id=?').bind(body.contextType,body.contextId,at,actor.id).run();
  }
  return response({...await readOnboardingSnapshot(actor),returnPath:safeInternalPath(new URL(request.url).searchParams.get('return_to'))});
 }catch(error){
  if(error instanceof z.ZodError)return response({error:error.issues[0]?.message||'Invalid onboarding request.'},400);
  console.error('Onboarding mutation failed',error instanceof Error?error.message:'Unknown error');return response({error:'The onboarding change could not be completed.'},503);
 }
}
