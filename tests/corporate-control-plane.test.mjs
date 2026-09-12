import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');
const temp=mkdtempSync(join(tmpdir(),'sessions-c4-'));
await build({entryPoints:[resolve('lib/access-control.ts'),resolve('lib/corporate-control-plane.ts')],bundle:true,platform:'node',format:'esm',outdir:temp,logLevel:'silent'});
const access=await import(pathToFileURL(join(temp,'access-control.js')));
const control=await import(pathToFileURL(join(temp,'corporate-control-plane.js')));
const actor=(roles)=>({roles,memberships:[]});

test('Phase 4 permissions extend existing roles without creating a second authority model',()=>{
 const support=actor(['support_agent']),finance=actor(['finance_admin']),trust=actor(['trust_safety']),operations=actor(['operations_admin']),corporate=actor(['corporate_admin']);
 assert.equal(access.hasPermission(support,'bookings:read'),true);assert.equal(access.hasPermission(support,'customers:read'),true);assert.equal(access.hasPermission(support,'settlements:review'),false);
 assert.equal(access.hasPermission(finance,'bookings:read'),true);assert.equal(access.hasPermission(finance,'memberships:oversight'),true);assert.equal(access.hasPermission(finance,'customers:read'),false);assert.equal(access.hasPermission(finance,'incidents:read'),false);
 assert.equal(access.hasPermission(trust,'incidents:read'),true);assert.equal(access.hasPermission(trust,'customers:read'),false);assert.equal(access.hasPermission(trust,'settlements:review'),false);
 for(const permission of ['bookings:read','customers:read','memberships:oversight','incidents:read','analytics:read','audit:read'])assert.equal(access.hasPermission(operations,permission),true,permission);
 assert.equal(access.hasPermission(corporate,'platform:roles.manage'),false);assert.equal(access.hasPermission(corporate,'audit:read'),true);
});

test('corporate navigation is generated from one canonical module registry',()=>{
 const ids=control.corporateModules.map(module=>module.id);
 for(const id of ['organization','bookings','customers','providers','memberships','incidents','finance','support','trust','analytics','audit','access'])assert.ok(ids.includes(id),id);
 const support=control.visibleCorporateModules(access.permissionsForRoles(['support_agent'])).map(module=>module.id);
 assert.ok(support.includes('bookings'));assert.ok(support.includes('customers'));assert.ok(support.includes('incidents'));assert.ok(support.includes('support'));
 assert.equal(support.includes('finance'),false);assert.equal(support.includes('access'),false);assert.equal(support.includes('analytics'),false);
 const finance=control.visibleCorporateModules(access.permissionsForRoles(['finance_admin'])).map(module=>module.id);
 assert.ok(finance.includes('bookings'));assert.ok(finance.includes('memberships'));assert.ok(finance.includes('finance'));assert.ok(finance.includes('analytics'));assert.equal(finance.includes('customers'),false);
});

test('control-plane routes and persistent navigation consume the same permission registry',async()=>{
 const [route,boundary,nav,workspace]=await Promise.all([read('app/[...slug]/page.tsx'),read('app/access-boundary.tsx'),read('app/corporate-navigation.tsx'),read('app/corporate-workspace.tsx')]);
 assert.match(route,/isCorporateReadModule\(slug\[1\]\)/);assert.match(route,/moduleForId\(slug\[1\]\)/);assert.match(route,/requiredPermissions=\{\[\.\.\.module\.requiredPermissions\]\}/);
 assert.match(boundary,/CorporateNavigation permissions=\{session\?\.permissions\|\|\[\]\}/);
 assert.match(nav,/visibleCorporateModules\(permissions\)/);
 assert.match(workspace,/visibleCorporateModules\(permissions\)/);
 assert.doesNotMatch(workspace,/Not assigned/,'unauthorized corporate modules should not be rendered as disabled navigation');
});

test('Phase 4 read API projects canonical tables and never creates parallel corporate domain records',async()=>{
 const api=await read('app/api/corporate/control-plane/route.ts');
 for(const table of ['studio_bookings','studio_members','studio_issues','booking_notifications','studio_settlements','studio_registry','studio_audit','corporate_org_events','corporate_security_events'])assert.match(api,new RegExp(table));
 assert.doesNotMatch(api,/CREATE TABLE|INSERT INTO corporate_(bookings|customers|memberships|incidents|analytics)/i);
 assert.match(api,/Booking mutation\/escalation workflows remain Phase 5/);
 assert.match(api,/Canonical incident\/case ownership, SLA and escalation workflow begins in Phase 5/);
 assert.match(api,/Page views, clicks, attribution, funnels, warehouse facts\/dimensions and governed event analytics are Phase 9/);
});

test('customer references are separately permission-gated and direct PII is excluded from Phase 4 projections',async()=>{
 const [api,policy]=await Promise.all([read('app/api/corporate/control-plane/route.ts'),read('lib/data-access-policy.ts')]);
 assert.match(policy,/customer_directory:'internal'/);assert.match(policy,/canReadCustomerField/);assert.match(policy,/field==='contact'.*support:manage/s);assert.match(policy,/customers:read/);
 assert.match(api,/bookings\(db,showCustomer:boolean\)/);assert.match(api,/canSeeCustomerRef=canReadCustomerField\(user,'reference'\)/);assert.match(api,/Customer references are omitted unless/);
 assert.doesNotMatch(api,/json_extract\(content,'\$\.phone'\)|json_extract\(content,'\$\.email'\)|json_extract\(content,'\$\.note'\)/);
});

test('Phase 4 adds indexes only and does not duplicate canonical database truth',async()=>{
 const migration=(await read('drizzle/0017_corporate_control_plane_indexes.sql')).replaceAll('--> statement-breakpoint','');
 assert.doesNotMatch(migration,/CREATE TABLE/i);assert.doesNotMatch(migration,/INSERT INTO/i);
 const db=new DatabaseSync(':memory:');
 db.exec("CREATE TABLE studio_bookings(id TEXT PRIMARY KEY,studio_id TEXT,customer TEXT,content TEXT);CREATE TABLE studio_members(id TEXT PRIMARY KEY,studio_id TEXT,customer TEXT,content TEXT);CREATE TABLE studio_issues(id TEXT PRIMARY KEY,content TEXT);");
 db.exec(migration);
 const indexes=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'studio_%' ORDER BY name").all().map(row=>String(row.name));
 for(const name of ['studio_bookings_status_created','studio_bookings_date_status','studio_bookings_customer_created','studio_members_status_created','studio_issues_status_created'])assert.ok(indexes.includes(name),name);
 db.close();
});

test('corporate control plane is desktop-dense but mobile-native in interaction layout',async()=>{
 const [css,manifest,layout]=await Promise.all([read('app/corporate-v4.css'),read('public/manifest.webmanifest').then(JSON.parse),read('app/layout.tsx')]);
 assert.match(css,/\.c4-nav-shell\{position:sticky/);assert.match(css,/overflow-x:auto/);assert.match(css,/@media \(max-width:720px\)/);assert.match(css,/\.c4-table td::before/);assert.match(css,/env\(safe-area-inset/);
 assert.equal(manifest.start_url,'/mobile');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'portrait-primary');assert.equal(manifest.theme_color,'#4169E1');
 assert.ok(layout.indexOf("import './corporate-v4.css';")<layout.indexOf("import './brand-v1.css';"),'brand-v1 must remain the final visual authority');
});

after(()=>rmSync(temp,{recursive:true,force:true}));
