import {database} from '@/db/store';
import {safeInternalPath} from '@/lib/onboarding-server';

const encoder=new TextEncoder();
async function digest(value:string){const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(value));return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')}
const now=()=>new Date();

export async function createContinuationIntent(returnPath:string,kind='route',userId:string|null=null){
 const path=safeInternalPath(returnPath,'/mobile');
 const token=`ct_${crypto.randomUUID().replaceAll('-','')}${crypto.randomUUID().replaceAll('-','')}`;
 const key=await digest(token);const created=now();const expires=new Date(created.getTime()+20*60_000);
 await database().prepare('INSERT INTO sessions_continuation_intents(digest,user_id,kind,return_path,status,created_at,expires_at,content) VALUES(?,?,?,?,?,?,?,?)').bind(key,userId,kind,path,'pending',created.toISOString(),expires.toISOString(),'{}').run();
 return token;
}

export async function resolveContinuationIntent(token:string|undefined|null,userId?:string|null){
 if(!token||token.length<20||token.length>180)return null;
 const key=await digest(token);const db=database();const row=await db.prepare('SELECT * FROM sessions_continuation_intents WHERE digest=? LIMIT 1').bind(key).first();
 if(!row||String(row.status)!=='pending')return null;
 if(Date.parse(String(row.expires_at))<=Date.now()){await db.prepare("UPDATE sessions_continuation_intents SET status='expired' WHERE digest=? AND status='pending'").bind(key).run();return null}
 if(userId&&row.user_id&&String(row.user_id)!==userId)return null;
 if(userId&&!row.user_id)await db.prepare('UPDATE sessions_continuation_intents SET user_id=? WHERE digest=? AND user_id IS NULL').bind(userId,key).run();
 return {returnPath:safeInternalPath(String(row.return_path),'/mobile'),kind:String(row.kind),expiresAt:String(row.expires_at)};
}

export async function consumeContinuationIntent(token:string,userId:string){
 const resolved=await resolveContinuationIntent(token,userId);if(!resolved)return null;
 const key=await digest(token);const at=new Date().toISOString();
 const result=await database().prepare("UPDATE sessions_continuation_intents SET status='consumed',consumed_at=? WHERE digest=? AND status='pending' AND user_id=?").bind(at,key,userId).run();
 return result.meta.changes===1?resolved:null;
}
