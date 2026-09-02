import {env} from 'cloudflare:workers';
import {database} from './store';
import {studioSeeds,type Studio,type Staff,type RegistryState,type StudioBooking,type Claim,type RegistryIssue} from '@/lib/registry';
export function isRegistryOperator(email:string){return ((env as unknown as {SESSIONS_ADMIN_EMAILS?:string}).SESSIONS_ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());}
export async function seedRegistry(){const db=database();await db.batch(studioSeeds.map(s=>db.prepare('INSERT OR IGNORE INTO studio_registry(id,content) VALUES(?,?)').bind(s.id,JSON.stringify(s))));}
export async function readRegistry(user:{email:string;displayName:string}|null,studioId?:string):Promise<RegistryState>{
 await seedRegistry();const db=database();const email=user?.email.toLowerCase()||'';const operator=isRegistryOperator(email);
 const rows=(await db.prepare('SELECT * FROM studio_registry').all()).results;
 const allStaff=(await db.prepare('SELECT * FROM studio_staff').all()).results;
 const ownerIds=rows.filter((r:any)=>r.owner===email&&!!email).map((r:any)=>r.id);
 const managedIds=[...ownerIds,...allStaff.filter((r:any)=>email&&r.email===email&&r.status==='active'&&r.role==='manager').map((r:any)=>r.studio_id)];
 const studios=rows.map((r:any)=>({...JSON.parse(r.content),revision:r.revision} as Studio)).filter((s:Studio)=>!s.hidden||operator||managedIds.includes(s.id));
 const staff=allStaff.filter((r:any)=>r.status==='active').map((r:any)=>JSON.parse(r.content) as Staff).filter((s:Staff)=>s.public&&studios.some((v:Studio)=>v.id===s.studioId)).map(({email,...s}:Staff)=>s);
 const personalStaff=allStaff.filter((r:any)=>email&&(r.email===email||ownerIds.includes(r.studio_id))).map((r:any)=>JSON.parse(r.content) as Staff);
 const bookings:StudioBooking[]=email?(await db.prepare('SELECT content FROM studio_bookings WHERE customer=? OR studio_id IN (SELECT id FROM studio_registry WHERE owner=?) OR studio_id IN (SELECT studio_id FROM studio_staff WHERE email=? AND status=\'active\' AND role=\'manager\') ORDER BY rowid DESC LIMIT 1000').bind(email,email,email).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const claims:Claim[]=email?(await db.prepare(operator?'SELECT content FROM studio_claim_requests ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_claim_requests WHERE applicant=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[email])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const issues:RegistryIssue[]=email?(await db.prepare(operator?'SELECT content FROM studio_issues ORDER BY rowid DESC LIMIT 500':'SELECT content FROM studio_issues WHERE reporter=? ORDER BY rowid DESC LIMIT 100').bind(...(operator?[]:[email])).all()).results.map((r:any)=>JSON.parse(r.content)):[];
 const occupancy=studioId?(await db.prepare('SELECT content FROM studio_bookings WHERE studio_id=?').bind(studioId).all()).results.map((r:any)=>JSON.parse(r.content) as StudioBooking).filter((b:StudioBooking)=>!['cancelled','declined'].includes(b.status)).map((b:StudioBooking)=>({studioId:b.studioId,roomId:b.roomId,date:b.date,start:b.start,duration:b.duration,status:b.status})):[];
 return {studios,staff,managedIds,ownerIds,bookings,claims,issues,operator,user,invitations:personalStaff.filter((s:Staff)=>s.status==='invited'),myStaff:personalStaff.filter((s:Staff)=>s.status==='active'),occupancy} as RegistryState;
}
