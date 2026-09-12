import {database} from '@/db/store';
import type {SessionUser} from '@/app/chatgpt-auth';
import {corporateRoles} from '@/lib/access-control';

export const REQUIRED_CONSENTS={terms:'2026-09-13-v1',privacy:'2026-09-13-v1'} as const;
export type WorkspaceContext={type:'personal'|'provider'|'corporate';id:string;label:string;status:'active'|'restricted'};
export type OnboardingSnapshot={
 profile:{status:string;displayName:string;market:string;locale:string;lastContextType:string|null;lastContextId:string|null};
 identity:{userId:string;email:string|null;phone:string|null;method:string;sessionId:string;assuranceLevel:string|null};
 consents:{terms:boolean;privacy:boolean;marketing:boolean;whatsapp:boolean};
 journeys:{id:string;journey:string;contextKey:string;status:string;currentStep:string}[];
 contexts:WorkspaceContext[];
 nextStep:'profile'|'consent'|'workspace'|'ready'|'restricted';
};

type Row=Record<string,unknown>;
const now=()=>new Date().toISOString();
export function safeInternalPath(value:string|undefined|null,fallback='/mobile'){
 if(!value||!value.startsWith('/')||value.startsWith('//'))return fallback;
 try{const url=new URL(value,'https://sessions.local');if(url.origin!=='https://sessions.local')return fallback;if(['/welcome','/auth/complete'].includes(url.pathname))return fallback;return `${url.pathname}${url.search}${url.hash}`}catch{return fallback}
}
const parse=(value:unknown)=>{try{return typeof value==='string'?JSON.parse(value):{}}catch{return {}}};

async function syncContact(db:any,actor:SessionUser,kind:'email'|'phone',value:string|null){
 if(!value)return;
 const existing=await db.prepare('SELECT id FROM sessions_user_contacts WHERE user_id=? AND kind=? AND value=? LIMIT 1').bind(actor.id,kind,value).first();
 const at=now();
 if(existing)await db.prepare('UPDATE sessions_user_contacts SET is_primary=1,verified_at=COALESCE(verified_at,?),source=?,updated_at=? WHERE id=?').bind(at,'identity_provider',at,String(existing.id)).run();
 else await db.prepare('INSERT INTO sessions_user_contacts(id,user_id,kind,value,is_primary,verified_at,source,consent_status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(`contact_${crypto.randomUUID()}`,actor.id,kind,value,1,at,'identity_provider','not_applicable',at,at,'{}').run();
}

export async function ensureOnboardingIdentity(actor:SessionUser){
 const db=database();const at=now();
 const existing=await db.prepare('SELECT user_id FROM sessions_user_profiles WHERE user_id=?').bind(actor.id).first();
 if(!existing){
  await db.batch([
   db.prepare('INSERT INTO sessions_user_profiles(user_id,status,display_name,market,locale,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(actor.id,'profile_required',actor.displayName||null,'ZW','en-ZW',at,at,'{}'),
   db.prepare('INSERT OR IGNORE INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,revision,started_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(`journey_${crypto.randomUUID()}`,actor.id,'customer','','profile_required','profile',0,at,at,'{}'),
   db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,context_id,reason_code,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').bind(`life_${crypto.randomUUID()}`,'system',actor.id,'identity.first_seen','identity',null,null,at,JSON.stringify({method:actor.method})),
  ]);
 }
 await Promise.all([syncContact(db,actor,'email',actor.email),syncContact(db,actor,'phone',actor.phone)]);
 return db;
}

async function latestConsent(db:any,userId:string,type:string){
 const row=await db.prepare('SELECT decision,document_version FROM sessions_consents WHERE user_id=? AND consent_type=? ORDER BY occurred_at DESC,id DESC LIMIT 1').bind(userId,type).first();
 return row?{decision:String(row.decision),version:String(row.document_version)}:null;
}

export async function readOnboardingSnapshot(actor:SessionUser):Promise<OnboardingSnapshot>{
 const db=await ensureOnboardingIdentity(actor);
 const profile=await db.prepare('SELECT * FROM sessions_user_profiles WHERE user_id=?').bind(actor.id).first() as Row;
 const journeyRows=(await db.prepare('SELECT id,journey,context_key,status,current_step FROM sessions_onboarding_journeys WHERE user_id=? ORDER BY started_at ASC').bind(actor.id).all()).results as Row[];
 const [terms,privacy,marketing,whatsapp]=await Promise.all(['terms','privacy','marketing','whatsapp'].map(type=>latestConsent(db,actor.id,type)));
 const contexts:WorkspaceContext[]=[];const status=String(profile.status);
 if(!['suspended','terminated','deletion_pending'].includes(status))contexts.push({type:'personal',id:'personal',label:'Personal',status:status==='restricted'?'restricted':'active'});
 for(const membership of actor.memberships||[])if(membership.active)contexts.push({type:'provider',id:membership.organizationId,label:`Studio · ${membership.organizationId}`,status:'active'});
 const isCorporate=actor.roles.some(role=>corporateRoles.includes(role));
 if(isCorporate){
  const staff=await db.prepare("SELECT id,status,content FROM corporate_staff WHERE user_id=? ORDER BY updated_at DESC LIMIT 1").bind(actor.id).first() as Row|undefined;
  if(staff&&String(staff.status)==='active'){const content=parse(staff.content);contexts.push({type:'corporate',id:String(staff.id),label:String(content.displayName||'Sessions Corporate'),status:'active'})}
 }
 const termsOk=terms?.decision==='granted'&&terms.version===REQUIRED_CONSENTS.terms;
 const privacyOk=privacy?.decision==='granted'&&privacy.version===REQUIRED_CONSENTS.privacy;
 let nextStep:OnboardingSnapshot['nextStep']='ready';
 if(['suspended','terminated','deletion_pending'].includes(status))nextStep='restricted';
 else if(status==='profile_required'||!profile.display_name)nextStep='profile';
 else if(!termsOk||!privacyOk)nextStep='consent';
 else if(contexts.length>1&&!profile.last_context_type)nextStep='workspace';
 return {
  profile:{status,displayName:String(profile.display_name||''),market:String(profile.market||'ZW'),locale:String(profile.locale||'en-ZW'),lastContextType:profile.last_context_type?String(profile.last_context_type):null,lastContextId:profile.last_context_id?String(profile.last_context_id):null},
  identity:{userId:actor.id,email:actor.email,phone:actor.phone,method:actor.method,sessionId:actor.sessionId,assuranceLevel:actor.assuranceLevel},
  consents:{terms:termsOk,privacy:privacyOk,marketing:marketing?.decision==='granted',whatsapp:whatsapp?.decision==='granted'},
  journeys:journeyRows.map(row=>({id:String(row.id),journey:String(row.journey),contextKey:String(row.context_key),status:String(row.status),currentStep:String(row.current_step)})),
  contexts,nextStep,
 };
}

export async function setProfileStatus(userId:string,status:string,actorUserId:string,reasonCode:string,contextType:'customer'|'identity'='customer'){
 const db=database();const at=now();
 await db.batch([
  db.prepare('UPDATE sessions_user_profiles SET status=?,updated_at=? WHERE user_id=?').bind(status,at,userId),
  db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,reason_code,created_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(`life_${crypto.randomUUID()}`,actorUserId,userId,`profile.${status}`,contextType,reasonCode,at,'{}'),
 ]);
}
