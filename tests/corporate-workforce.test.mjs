import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const migration=(await read('drizzle/0013_corporate_workforce.sql')).replaceAll('--> statement-breakpoint','');

function database(){const db=new DatabaseSync(':memory:');db.exec(migration);return db}

test('corporate workforce migration is additive and keeps authority out of organization records',()=>{
 const db=database();
 const tables=['corporate_departments','corporate_positions','corporate_staff','corporate_reporting_lines','corporate_delegations','corporate_org_events'];
 for(const table of tables){
  const found=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table);
  assert.equal(found?.name,table);
 }
 const staffColumns=db.prepare('PRAGMA table_info(corporate_staff)').all().map(row=>row.name);
 assert.ok(staffColumns.includes('user_id'));
 assert.ok(staffColumns.includes('position_id'));
 assert.equal(staffColumns.some(name=>/role|permission|admin/i.test(String(name))),false,'workforce records must not grant RBAC authority');
 db.close();
});

test('department and staff identities are unique',()=>{
 const db=database();const now='2026-09-11T00:00:00.000Z';
 db.prepare('INSERT INTO corporate_departments(id,code,name,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('d1','FIN','Finance','active',now,now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_departments(id,code,name,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('d2','FIN','Finance two','active',now,now,'{}'),/UNIQUE/);
 db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('s1','user-one','SZ-001','active',now,now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('s2','user-one','SZ-002','active',now,now,'{}'),/UNIQUE/);
 db.close();
});

test('reporting constraints reject self-management and multiple active primary managers',()=>{
 const db=database();const now='2026-09-11T00:00:00.000Z';
 for(const [id,user,code] of [['s1','u1','SZ-001'],['s2','u2','SZ-002'],['s3','u3','SZ-003']])db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run(id,user,code,'active',now,now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_reporting_lines(id,staff_id,manager_staff_id,kind,status,effective_from,created_at,content) VALUES(?,?,?,?,?,?,?,?)').run('r0','s1','s1','primary','active','2026-09-11',now,'{}'),/CHECK/);
 db.prepare('INSERT INTO corporate_reporting_lines(id,staff_id,manager_staff_id,kind,status,effective_from,created_at,content) VALUES(?,?,?,?,?,?,?,?)').run('r1','s1','s2','primary','active','2026-09-11',now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_reporting_lines(id,staff_id,manager_staff_id,kind,status,effective_from,created_at,content) VALUES(?,?,?,?,?,?,?,?)').run('r2','s1','s3','primary','active','2026-09-11',now,'{}'),/UNIQUE/);
 db.close();
});

test('delegation is responsibility metadata and cannot self-delegate',()=>{
 const db=database();const now='2026-09-11T00:00:00.000Z';
 for(const [id,user,code] of [['s1','u1','SZ-001'],['s2','u2','SZ-002']])db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run(id,user,code,'active',now,now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_delegations(id,principal_staff_id,delegate_staff_id,scope,status,starts_at,ends_at,created_by,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').run('x','s1','s1','all','active',now,'2026-09-12T00:00:00.000Z','u1',now,'{}'),/CHECK/);
 db.prepare('INSERT INTO corporate_delegations(id,principal_staff_id,delegate_staff_id,scope,status,starts_at,ends_at,created_by,created_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').run('ok','s1','s2','department','active',now,'2026-09-12T00:00:00.000Z','u1',now,'{}');
 assert.equal(db.prepare('SELECT scope FROM corporate_delegations WHERE id=?').get('ok').scope,'department');
 db.close();
});

test('organization route and UI are protected by explicit organization permissions',async()=>{
 const [route,workspace,page,api]=await Promise.all([read('app/[...slug]/page.tsx'),read('app/corporate-workspace.tsx'),read('app/corporate-organization.tsx'),read('app/api/corporate/organization/route.ts')]);
 assert.match(route,/corporate\/organization/);
 assert.match(route,/requiredPermissions=\{\['organization:read'\]\}/);
 assert.match(workspace,/permission:'organization:read'/);
 assert.match(workspace,/Organization & people/);
 assert.match(api,/hasPermission\(actor,'organization:manage'\)/);
 assert.match(api,/authorityChanged:false/);
 assert.match(api,/reportingCycle/);
 assert.match(route,/CorporateOrganization/);
 assert.match(page,/ORGANIZATION & PEOPLE/);
});
