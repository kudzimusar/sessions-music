import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');
const migration=(await read('drizzle/0015_access_reviews.sql')).replaceAll('--> statement-breakpoint','');
function database(){const db=new DatabaseSync(':memory:');db.exec(migration);return db}

test('access review schema records governance decisions but never grants authority',()=>{
 const db=database();for(const table of ['corporate_access_reviews','corporate_access_review_items'])assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)?.name,table);const columns=db.prepare('PRAGMA table_info(corporate_access_review_items)').all().map(row=>String(row.name));assert.ok(columns.includes('decision'));assert.ok(columns.includes('remediation_status'));assert.equal(columns.some(name=>['enabled','active','permission_grant','role_grant'].includes(name)),false);db.close();
});

test('one review snapshots a user-role assignment only once and validates decisions',()=>{
 const db=database();const now='2026-09-11T00:00:00.000Z';db.prepare('INSERT INTO corporate_access_reviews(id,title,status,created_by,created_at,snapshot_count,content) VALUES(?,?,?,?,?,?,?)').run('r1','Quarterly access review','open','admin-a',now,1,'{}');const insert=(id,decision='pending',remediation='not_required')=>db.prepare('INSERT INTO corporate_access_review_items(id,review_id,user_id,role,decision,remediation_status,content) VALUES(?,?,?,?,?,?,?)').run(id,'r1','user-a','finance_admin',decision,remediation,'{}');insert('i1');assert.throws(()=>insert('i2'),/UNIQUE/);assert.throws(()=>db.prepare('INSERT INTO corporate_access_review_items(id,review_id,user_id,role,decision,remediation_status,content) VALUES(?,?,?,?,?,?,?)').run('i3','r1','user-b','support_agent','approve','not_required','{}'),/CHECK/);assert.throws(()=>db.prepare('INSERT INTO corporate_access_review_items(id,review_id,user_id,role,decision,remediation_status,content) VALUES(?,?,?,?,?,?,?)').run('i4','r1','user-c','support_agent','revoke','pretend_complete','{}'),/CHECK/);db.close();
});

test('access review workflow snapshots trusted roles and separates visibility from mutation',async()=>{
 const [route,admin]=await Promise.all([read('app/api/corporate/access-reviews/route.ts'),read('lib/supabase-admin.ts')]);assert.match(route,/hasPermission\(user,'security:read'\)/);assert.match(route,/const user=await privilegedActor\(\)/);assert.match(route,/requirePrivilegedSession\(user\)/);assert.match(route,/listActivePlatformRoleAssignments\(\)/);assert.match(route,/input\.decision==='revoke'\?'pending':'not_required'/);assert.match(route,/setPlatformRole\(\{userId:String\(item\.user_id\),role:String\(item\.role\) as PlatformRole,enabled:false/);assert.match(route,/Every revoke decision must be successfully remediated before completion/);assert.match(route,/Do not revoke the current privileged administrator through its own session/);assert.match(route,/access_review\.remediated/);assert.match(route,/maskedRef\(row\.user_id\)/);assert.match(admin,/platform_role_assignments\?revoked_at=is\.null/);assert.match(admin,/row\.role==='musician'/);
});

test('Access & Security route is governance-readable while mutations stay privileged',async()=>{
 const [page,ui]=await Promise.all([read('app/[...slug]/page.tsx'),read('app/corporate-access-reviews.tsx')]);assert.match(page,/slug\[1\]==='access'.*requiredPermissions=\{\['security:read'\]\}.*CorporateAccessReviews/s);assert.match(ui,/Decision ≠ remediation/);assert.match(ui,/Read-only security view/);assert.match(ui,/eligible administrator, AAL2 assurance, current 15-minute privileged session/);assert.match(ui,/Complete access review/);assert.match(ui,/Remediation outstanding/);assert.match(ui,/c4-table/);
});
