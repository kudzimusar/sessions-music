import {env} from 'cloudflare:workers';
import {database} from './store';
import {studioSeeds,kulchaAddressCorrection,type Studio,type Staff,type RegistryState,type StudioBooking,type StudioSettlement,type StudioInvoice,type Claim,type RegistryIssue,type RegistryUser,type VerificationRequest} from '@/lib/registry';
export function isRegistryOperator(email:string){return ((env as unknown as {SESSIONS_ADMIN_EMAILS?:string}).SESSIONS_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());}
export function isRegistryUserOperator(user:{email?:string|null;roles?:readonly string[]}|null){return !!user&&(user.roles?.includes('operations_admin')||isRegistryOperator(user.email||''));}
export async function seedRegistry(){
 const db=database();await db.batch(studioSeeds.map(s=>db.prepare('INSERT OR IGNORE INTO studio_registry(id,content) VALUES(?,?)').bind(s.id,JSON.stringify(s))));
 // Bounded, idempotent data enrichment, not a schema migration. Never replace owner
 // data, existing pins, or a corrected address; a concurrent editor sees a revision conflict.
 const patches=studioSeeds.filter(s=>s.publicLocation).map(s=>db.prepare("UPDATE studio_registry SET content=json_set(content,'$.publicLocation',json(?)),revision=revision+1 WHERE id=? AND owner IS NULL AND json_extract(content,'$.status')='unclaimed' AND json_extract(content,'$.address')=? AND json_extract(content,'$.location') IS NULL AND json_extract(content,'$.publicLocation') IS NULL").bind(JSON.stringify(s.publicLocation),s.id,s.address));
 const c=kulchaAddressCorrection;
 patches.push(db.prepare("UPDATE studio_registry SET content=json_set(content,'$.address',?,'$.area',?,'$.sources',json_insert(json_extract(content,'$.sources'),'$[#]',json(?))),revision=revision+1 WHERE id=? AND owner IS NULL AND revision=0 AND json_extract(content,'$.address')=?").bind(c.address,c.area,JSON.stringify(c.source),c.id,c.previous));
 await db.batch(patches);
}
export async function readRegistry(user:(Partial<RegistryUser>&{email?:string|null;displayName:string;memberships?:readonly {organizationId:string;active:boolean}[]})|null,studioId?:string):Promise<RegistryState>{
 await seedRegistry();const db=database();const email=user?.email?.toLowerCase()||'';const phone=user?.phone||'';const contacts=[email,phone].filter(Boolean);const actor=user?.id||email;const operator=isRegistryUserOperator(user);
 const rows=(await db.prepare('SELECT * FROM studio_registry').all()).results;
 const allStaff=(await db.prepare('SELECT * FROM studio_staff').all()).results;
 const legacyIdentity=!user?.method||user.method==='chatgpt_demo';const activeOrganizations=new Set((user?.memberships||[]).filter(value=>value.active).map(value=>value.organizationId));
 const ownerIds=rows.filter((r:any)=>r.owner===actor&&!!actor&&(legacyIdentity||activeOrganizations.has(r.id))).map((r:any)=>r.id);
 const managedIds=[...ownerIds,...allStaff.filter((r:any)=>contacts.includes(r.email)&&r.status==='active'&&r.role==='manager'&&(legacyIdentity||activeOrganizations.has(r.studio_id))).map((r:any)=>r.studio_id)];
 const studios=rows.map((r:any)=>({...JSON.parse(r.content),revision:r.revision} as Studio)).filter((s:Studio)=>!s.hidden||operator||managedIds.includes(s.id));
 const staff=allStaff.filter((r:any)=>r.status==='active').map((r:any)=>JSON.parse(r.content) as Staff).filter((s:Staff)=>s.public&&studios.some((v:Studio)=>v.id===s.studioId)).map(({email,inviteContact,...s}:Staff)=>s);
 const personalStaff=allStaff.filter((r:any)=>contacts.includes(r.email)||ownerIds.includes(r.studio_id)).map((r:any)=>JSON.parse(r.content) as Staff);
 const bookingSql=operator?'SELECT content FROM studio_bookings ORDER BY rowid DESC LIMIT 2000':'SELECT content FROM studio_bookings WHERE customer=? OR studio_id IN (SELECT id FROM studio_registry WHERE owner=?) OR studio_id IN (SELECT studio_id FROM studio_staff WHERE email IN (?,?) AND status=\'active\' AND role=\'manager\') ORDER BY rowid DESC LIMIT 1000';
 const bookings:StudioBooking[]=actor?(await db.prepare(bookingSql).bind(...(operator?[]:[actor,actor,contacts[0]||'',contacts[1]||''])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const settlementSql=operator?'SELECT revision,content FROM studio_settlements ORDER BY rowid DESC LIMIT 2000':'SELECT revision,content FROM studio_settlements WHERE customer=? OR studio_id IN (SELECT id FROM studio_registry WHERE owner=?) OR studio_id IN (SELECT studio_id FROM studio_staff WHERE email IN (?,?) AND status=\'active\' AND role=\'manager\') ORDER BY rowid DESC LIMIT 1000';
 const settlements:StudioSettlement[]=actor?(await db.prepare(settlementSql).bind(...(operator?[]:[actor,actor,contacts[0]||'',contacts[1]||''])).all()).results.map((r:any)=>({...JSON.parse(r.content),revision:r.revision})):[];
 const invoiceSql=operator?'SELECT content FROM studio_invoices ORDER BY period DESC LIMIT 1000':'SELECT content FROM studio_invoices WHERE studio_id IN (SELECT id FROM studio_registry WHERE owner=?) OR studio_id IN (SELECT studio_id FROM studio_staff WHERE email IN (?,?) AND status=\'active\' AND role=\'manager\') ORDER BY period DESC LIMIT 500';
 const invoices:StudioInvoice[]=actor?(await db.prepare(invoiceSql).bind(...(operator?[]:[actor,contacts[0]||'',contacts[1]||''])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const claims:Claim[]=actor?(await db.prepare(operator?'SELECT content FROM studio_claim_requests ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_claim_requests WHERE applicant=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[actor])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const issues:RegistryIssue[]=actor?(await db.prepare(operator?'SELECT content FROM studio_issues ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_issues WHERE reporter=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[actor])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const occupancy=studioId?(await db.prepare('SELECT content FROM studio_bookings WHERE studio_id=?').bind(studioId).all()).results.map((r:any)=>JSON.parse(r.content) as StudioBooking).filter((b:StudioBooking)=>!['cancelled','declined'].includes(b.status)).map((b:StudioBooking)=>({studioId:b.studioId,roomId:b.roomId,date:b.date,start:b.start,duration:b.duration,status:b.status})):[];
 const registrations=actor?(await db.prepare(operator?'SELECT content FROM studio_registrations ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_registrations WHERE applicant=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[actor])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const verifications:VerificationRequest[]=actor?(await db.prepare(operator?'SELECT content FROM studio_verification_requests ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_verification_requests WHERE applicant=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[actor])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const memberships=actor?(await db.prepare('SELECT content FROM studio_members WHERE customer=? OR studio_id IN (SELECT id FROM studio_registry WHERE owner=?)').bind(actor,actor).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const normalizedUser=user?{id:actor,displayName:user.displayName,email:user.email||null,phone:user.phone||null,roles:user.roles||[],method:user.method,sessionId:user.sessionId}:null;
 return {memberships,registrations,verifications,settlements,invoices,studios,staff,managedIds,ownerIds,bookings,claims,issues,operator,user:normalizedUser,invitations:personalStaff.filter((s:Staff)=>s.status==='invited'),myStaff:personalStaff.filter((s:Staff)=>s.status==='active'),occupancy} as RegistryState;
}
