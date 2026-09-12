import {redirect} from 'next/navigation';
import {getProductionUser} from '@/app/chatgpt-auth';
import {readOnboardingSnapshot} from '@/lib/onboarding-server';
import {database} from '@/db/store';
import ProviderOnboarding from '@/app/provider-onboarding';

export const dynamic='force-dynamic';
const parse=(value:unknown)=>{try{return JSON.parse(String(value||'{}'))}catch{return {}}};
export default async function ProviderOnboardingPage(){
 const actor=await getProductionUser();if(!actor)redirect('/welcome?return_to=%2Fonboarding%2Fprovider');
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);if(!snapshot)redirect('/onboarding?return_to=%2Fonboarding%2Fprovider');
 if(['profile','consent','restricted'].includes(snapshot.nextStep))redirect('/onboarding?return_to=%2Fonboarding%2Fprovider');
 const db=database();
 const [claimRows,registrationRows,verificationRows,studioRows]=await Promise.all([
  db.prepare('SELECT id,studio_id,status,content FROM studio_claim_requests WHERE applicant=? ORDER BY rowid DESC LIMIT 20').bind(actor.id).all(),
  db.prepare('SELECT id,status,content FROM studio_registrations WHERE applicant=? ORDER BY rowid DESC LIMIT 20').bind(actor.id).all(),
  db.prepare('SELECT id,studio_id,status,content FROM studio_verification_requests WHERE applicant=? ORDER BY rowid DESC LIMIT 20').bind(actor.id).all(),
  db.prepare('SELECT id,owner,content FROM studio_registry ORDER BY rowid DESC').all(),
 ]);
 const studios=new Map((studioRows.results as Record<string,unknown>[]).map(row=>{const value=parse(row.content);return [String(row.id),{id:String(row.id),name:String(value.name||row.id),status:String(value.status||'unclaimed'),bookingEnabled:!!value.bookingEnabled,owner:row.owner?String(row.owner):null}]}));
 const claims=(claimRows.results as Record<string,unknown>[]).map(row=>{const value=parse(row.content);return {id:String(row.id),studioId:String(row.studio_id),studioName:studios.get(String(row.studio_id))?.name||String(row.studio_id),status:String(row.status),createdAt:String(value.createdAt||''),note:String(value.note||'')}});
 const registrations=(registrationRows.results as Record<string,unknown>[]).map(row=>{const value=parse(row.content);return {id:String(row.id),name:String(value.name||'New studio'),status:String(row.status),createdAt:String(value.createdAt||''),note:String(value.note||'')}});
 const verifications=(verificationRows.results as Record<string,unknown>[]).map(row=>{const value=parse(row.content);return {id:String(row.id),studioId:String(row.studio_id),studioName:studios.get(String(row.studio_id))?.name||String(row.studio_id),status:String(row.status),createdAt:String(value.createdAt||''),note:String(value.note||'')}});
 const memberships=actor.memberships.filter(value=>value.active).map(value=>{const studio=studios.get(value.organizationId);return {studioId:value.organizationId,name:studio?.name||value.organizationId,role:value.role,status:studio?.status||'unknown',bookingEnabled:studio?.bookingEnabled||false}});
 return <ProviderOnboarding snapshot={snapshot} claims={claims} registrations={registrations} verifications={verifications} memberships={memberships}/>;
}
