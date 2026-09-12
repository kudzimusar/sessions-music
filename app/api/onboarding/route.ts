import {z} from 'zod';
import {getProductionUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {normalizeZimbabwePhone} from '@/lib/identity-core';
import {consumeContinuationIntent} from '@/lib/continuation';
import {REQUIRED_CONSENTS,readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
const newId=(prefix:string)=>`${prefix}_${crypto.randomUUID()}`;
const now=()=>new Date().toISOString();
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('completeProfile'),displayName:z.string().trim().min(2).max(100),market:z.literal('ZW').default('ZW'),locale:z.enum(['en-ZW','sn-ZW','nd-ZW']).default('en-ZW')}),
 z.object({action:z.literal('recordConsent'),consentType:z.enum(['terms','privacy','marketing']),granted:z.boolean(),idempotencyKey:z.string().min(8).max(120),channel:z.enum(['web','pwa','ios','android']).default('web')}),
 z.object({action:z.literal('setIntention'),journey:z.enum(['customer','provider','corporate'])}),
 z.object({action:z.literal('setWhatsAppPreference'),phone:z.string().min(7).max(30),optedIn:z.boolean(),idempotencyKey:z.string().min(8).max(120),channel:z.enum(['web','pwa','ios','android']).default('web')}),
 z.object({action:z.literal('setLastContext'),contextType:z.enum(['personal','provider','corporate']),contextId:z.string().min(1).max(160)}),
 z.object({action:z.literal('consumeContinuation'),token:z.string().min(20).max(180)}),
]);

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
    const staff=await db.prepare("SELECT id,status FROM corporate_staff WHERE user_id=? AND status IN ('invited','active') ORDER BY updated_at DESC LIMIT 1").bind(actor.id).first();
    if(!staff)return response({error:'Corporate access is invitation-only. No active Sessions staff invitation matches this identity.'},403);
    const status=String(staff.status)==='active'?'security_setup_required':'invited';
    await db.prepare("INSERT INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,revision,started_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,journey,context_key) DO UPDATE SET status=excluded.status,current_step=excluded.current_step,revision=sessions_onboarding_journeys.revision+1,updated_at=excluded.updated_at").bind(newId('journey'),actor.id,'corporate',String(staff.id),status,status==='invited'?'accept_invitation':'security_setup',0,at,at,'{}').run();
   }else await db.prepare("UPDATE sessions_onboarding_journeys SET updated_at=? WHERE user_id=? AND journey='customer'").bind(at,actor.id).run();
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
