import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const migration=(await read('drizzle/0014_privileged_administration.sql')).replaceAll('--> statement-breakpoint','');

test('privileged administration schema stores elevation, never platform roles',()=>{
 const db=new DatabaseSync(':memory:');db.exec(migration);
 const columns=db.prepare('PRAGMA table_info(corporate_privileged_sessions)').all().map(row=>String(row.name));
 assert.ok(columns.includes('identity_session_id'));
 assert.ok(columns.includes('assurance_level'));
 assert.ok(columns.includes('expires_at'));
 assert.equal(columns.some(name=>name==='role'||name==='permission'),false);
 db.close();
});

test('only one active privileged session exists per identity',()=>{
 const db=new DatabaseSync(':memory:');db.exec(migration);const now='2026-09-11T00:00:00.000Z',expires='2026-09-11T00:15:00.000Z';
 const insert=(id,session)=>db.prepare('INSERT INTO corporate_privileged_sessions(id,user_id,identity_session_id,status,assurance_level,purpose,created_at,expires_at,content) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'user-a',session,'active','aal2','Role administration',now,expires,'{}');
 insert('p1','session-a');
 assert.throws(()=>insert('p2','session-b'),/UNIQUE/);
 db.prepare("UPDATE corporate_privileged_sessions SET status='revoked',revoked_at=? WHERE id='p1'").run(now);
 insert('p2','session-b');
 assert.equal(db.prepare("SELECT identity_session_id FROM corporate_privileged_sessions WHERE status='active'").get().identity_session_id,'session-b');
 db.close();
});

test('database refuses a privileged session that is not AAL2',()=>{
 const db=new DatabaseSync(':memory:');db.exec(migration);
 assert.throws(()=>db.prepare('INSERT INTO corporate_privileged_sessions(id,user_id,identity_session_id,status,assurance_level,purpose,created_at,expires_at,content) VALUES(?,?,?,?,?,?,?,?,?)').run('p1','user-a','session-a','active','aal1','Role administration','2026-09-11T00:00:00.000Z','2026-09-11T00:15:00.000Z','{}'),/CHECK/);
 db.close();
});

test('platform role mutation is gated by current privileged session',async()=>{
 const [roles,privileged]=await Promise.all([read('app/api/corporate/roles/route.ts'),read('app/api/corporate/privileged/route.ts')]);
 assert.match(roles,/requirePrivilegedSession\(actor\)/);
 assert.match(roles,/Activate a current AAL2 privileged administration session/);
 assert.match(privileged,/actor\.assuranceLevel!=='aal2'/);
 assert.match(privileged,/15\*60\*1000/);
 assert.match(privileged,/privileged_session\.replaced/);
 assert.match(privileged,/ChatGPT preview identity/);
});
