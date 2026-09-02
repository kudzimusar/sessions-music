import {z} from 'zod';
import {database} from './store';
import type {Registration} from '@/lib/discovery';
import type {Studio} from '@/lib/registry';
const str=z.string().trim();
export async function registrationAction(p:any,email:string,operator:boolean):Promise<Response|null>{
 const db=database(),now=new Date().toISOString();
 const error=(message:string,status=400)=>Response.json({error:message},{status});
 if(p.type==='registerStudio'){
 const v=z.object({name:str.min(3).max(120),area:str.min(2).max(80),address:str.min(10).max(300),category:z.enum(['Rehearsal studio','Recording studio','Music institution','Production facility']),description:str.min(30).max(2000),website:str.url().startsWith('https://').max(1000),phone:str.min(7).max(40),representative:str.min(2).max(120),evidence:str.min(30).max(2000),consent:z.literal(true)}).parse(p);
 const duplicate=await db.prepare("SELECT id FROM studio_registry WHERE lower(trim(json_extract(content,'$.name')))=lower(?) UNION SELECT id FROM studio_registrations WHERE status='pending' AND lower(trim(json_extract(content,'$.name')))=lower(?)").bind(v.name,v.name).first();
 if(duplicate)return error('A listing or pending registration already uses this name. Search the directory or track your existing application.',409);
 const count=await db.prepare("SELECT count(*) n FROM studio_registrations WHERE applicant=? AND status='pending'").bind(email).first();if(count.n>=3)return error('Wait for your pending studio registrations to be reviewed.',429);
 const record:Registration={...v,id:crypto.randomUUID(),applicant:email,status:'pending',createdAt:now};
 await db.prepare('INSERT INTO studio_registrations(id,applicant,status,content) VALUES(?,?,?,?)').bind(record.id,email,record.status,JSON.stringify(record)).run();
 return Response.json({ok:true,registration:record});
 }
 if(p.type!=='reviewRegistration')return null;
 if(!operator)return error('Registry operator access required',403);
 const v=z.object({id:str.min(1).max(100),decision:z.enum(['approved','rejected']),note:str.min(20).max(2000),independentContact:z.literal(true),authorityChecked:z.literal(true)}).parse(p);
 const row=await db.prepare('SELECT * FROM studio_registrations WHERE id=?').bind(v.id).first();if(!row||row.status!=='pending')return error('Registration is no longer pending',409);
 const record:Registration=JSON.parse(row.content);if(record.applicant===email)return error('You cannot review your own registration',403);
 const statements:any[]=[];const guard=crypto.randomUUID();
 statements.push(db.prepare("INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN status='pending' THEN 1 ELSE 0 END FROM studio_registrations WHERE id=?))").bind(guard,v.id));
 if(v.decision==='approved'){
 const duplicate=await db.prepare("SELECT id FROM studio_registry WHERE lower(trim(json_extract(content,'$.name')))=lower(?)").bind(record.name).first();if(duplicate)return error('A studio with this name now exists. Reject this registration and direct the applicant to its claim page.',409);
 const studio:Studio={id:'studio-'+record.id,name:record.name,area:record.area,address:record.address,category:record.category,description:record.description,website:record.website,phone:record.phone,email:'',services:[record.category==='Rehearsal studio'?'Rehearsal':'Recording'],status:'claimed',bookingEnabled:false,rooms:[],equipment:'',rules:'',location:null,revision:0,verifiedAt:now,sources:[{title:'Business website reviewed during registration',url:record.website,kind:'Official website',checked:now.slice(0,10)}]};
 record.studioId=studio.id;statements.push(db.prepare('INSERT INTO studio_registry(id,owner,content) VALUES(?,?,?)').bind(studio.id,record.applicant,JSON.stringify(studio)));
 }
 record.status=v.decision;record.note=v.note;
 statements.push(db.prepare('UPDATE studio_registrations SET status=?,content=? WHERE id=?').bind(record.status,JSON.stringify(record),record.id),db.prepare('INSERT INTO studio_audit(id,studio_id,actor,event,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),record.studioId||record.id,email,'reviewRegistration:'+v.decision,now),db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard));
 await db.batch(statements);return Response.json({ok:true});
}
