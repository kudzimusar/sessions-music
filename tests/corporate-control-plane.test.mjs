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
const access=await import(pathToFileURL(join(temp,'access-control.js')));const control=await import(pathToFileURL(join(temp,'corporate-control-plane.js')));
const actor=(roles,scopedRoles=[])=>({roles,scopedRoles,memberships:[]});

test('Phase 4 functional roles are narrow and do not collapse back into broad Operations',()=>{
 const support=actor(['support_agent']),finance=actor(['finance_admin']),trust=actor(['trust_safety']),growth=actor(['growth_analyst']),data=actor(['data_analyst']),product=actor(['product_operations']),governance=actor(['governance_reviewer']),corporate=actor(['corporate_admin']);
 assert.equal(access.hasPermission(support,'customers:read'),true);assert.equal(access.hasPermission(support,'settlements:review'),false);
 assert.equal(access.hasPermission(finance,'analytics:finance.read'),true);assert.equal(access.hasPermission(finance,'customers:read'),false);assert.equal(access.hasPermission(finance,'incidents:read'),false);
 assert.equal(access.hasPermission(trust,'incidents:read'),true);assert.equal(access.hasPermission(trust,'settlements:review'),false);
 assert.equal(access.hasPermission(growth,'growth:read'),true);assert.equal(access.hasPermission(growth,'analytics:finance.read'),false);assert.equal(access.hasPermission(growth,'customers:read'),false);
 assert.equal(access.hasPermission(data,'analytics:product.read'),true);assert.equal(access.hasPermission(data,'analytics:finance.read'),false);
 assert.equal(access.hasPermission(product,'platform:read'),true);assert.equal(access.hasPermission(product,'corporate_settings:manage'),false);
 assert.equal(access.hasPermission(governance,'security:read'),true);assert.equal(access.hasPermission(governance,'platform:roles.manage'),false);
 assert.equal(access.hasPermission(corporate,'platform:roles.manage'),false);assert.equal(access.hasPermission(corporate,'corporate_settings:manage'),true);
});

test('scoped assignments remain context and never become global permission grants',()=>{
 const scoped=actor(['musician'],[{role:'provider_operations',scopeType:'provider',scopeId:'studio-a'}]);
 assert.equal(access.hasScopedPlatformRole(scoped,'provider_operations','provider','studio-a'),true);
 assert.equal(access.hasPermission(scoped,'providers:oversight'),false);
 assert.equal(access.canAccessSurface(scoped,'corporate'),false);
});

test('corporate navigation covers the approved Phase 4 information architecture from one registry',()=>{
 const ids=control.corporateModules.map(module=>module.id);
 for(const id of ['organization','access','bookings','customers','providers','memberships','incidents','finance','support','trust','growth','analytics','platform','audit','settings'])assert.ok(ids.includes(id),id);
 const support=control.visibleCorporateModules(access.permissionsForRoles(['support_agent'])).map(module=>module.id);assert.ok(support.includes('bookings'));assert.ok(support.includes('customers'));assert.ok(support.includes('incidents'));assert.ok(support.includes('support'));assert.equal(support.includes('finance'),false);assert.equal(support.includes('access'),false);assert.equal(support.includes('analytics'),false);
 const growth=control.visibleCorporateModules(access.permissionsForRoles(['growth_analyst'])).map(module=>module.id);assert.ok(growth.includes('growth'));assert.ok(growth.includes('analytics'));assert.equal(growth.includes('finance'),false);assert.equal(growth.includes('customers'),false);
 const product=control.visibleCorporateModules(access.permissionsForRoles(['product_operations'])).map(module=>module.id);assert.ok(product.includes('platform'));assert.ok(product.includes('analytics'));assert.equal(product.includes('settings'),false);
 const governance=control.visibleCorporateModules(access.permissionsForRoles(['governance_reviewer'])).map(module=>module.id);assert.ok(governance.includes('access'));assert.ok(governance.includes('audit'));assert.equal(governance.includes('finance'),false);
});

test('department workspace ownership is explicit but remains separate from RBAC',async()=>{
 const modules=control.visibleCorporateModules(access.permissionsForRoles(['corporate_admin']));const contexts=control.departmentContextsForModules(modules);const marketplace=contexts.find(value=>value.department==='Marketplace Operations');
 assert.ok(marketplace?.modules.some(module=>module.id==='bookings'));assert.equal(control.moduleForId('memberships').ownerDepartment,'Memberships & Retention');assert.equal(control.moduleForId('growth').ownerDepartment,'Growth & Marketing');
 const source=await read('lib/corporate-control-plane.ts');const authBody=source.slice(source.indexOf('export function canOpenCorporateModule'),source.indexOf('export function visibleCorporateModules'));assert.doesNotMatch(authBody,/ownerDepartment|supportingDepartments/);
});

test('control-plane routes and persistent navigation consume the same permission registry',async()=>{
 const [route,boundary,nav,workspace]=await Promise.all([read('app/[...slug]/page.tsx'),read('app/access-boundary.tsx'),read('app/corporate-navigation.tsx'),read('app/corporate-workspace.tsx')]);
 assert.match(route,/isCorporateReadModule\(slug\[1\]\)/);assert.match(route,/moduleForId\(slug\[1\]\)/);assert.match(route,/requiredPermissions=\{\[\.\.\.module\.requiredPermissions\]\}/);assert.match(route,/corporate\/access.*security:read/s);
 assert.match(boundary,/CorporateNavigation permissions=\{session\?\.permissions\|\|\[\]\}/);assert.match(nav,/visibleCorporateModules\(permissions\)/);assert.match(workspace,/departmentContextsForModules\(modules\)/);assert.doesNotMatch(workspace,/Not assigned/);
});

test('Phase 4 read API projects canonical tables and does not create parallel corporate domain records',async()=>{
 const api=await read('app/api/corporate/control-plane/route.ts');for(const table of ['studio_bookings','studio_members','studio_issues','booking_notifications','studio_settlements','studio_registry','studio_audit','corporate_org_events','corporate_security_events'])assert.match(api,new RegExp(table));
 assert.doesNotMatch(api,/CREATE TABLE|INSERT INTO corporate_(bookings|customers|memberships|incidents|analytics)/i);assert.match(api,/Booking mutation, assignment, timeline and escalation workflows remain Phase 5/);assert.match(api,/Canonical case ownership, SLA, assignment, evidence and escalation workflow begins in Phase 5/);assert.match(api,/Acquisition source, CAC, campaign attribution, page views, click funnels and conversion attribution require the governed Phase 9 event pipeline/);
});

test('customer, finance and audit fields remain separately permission-gated',async()=>{
 const [api,policy]=await Promise.all([read('app/api/corporate/control-plane/route.ts'),read('lib/data-access-policy.ts')]);assert.match(policy,/customer_directory:'internal'/);assert.match(policy,/canReadCustomerField/);assert.match(api,/canSeeCustomerRef=canReadCustomerField\(user,'reference'\)/);assert.match(api,/analytics:finance\.read/);assert.match(api,/analytics:executive\.read/);assert.match(api,/maskedRef\(row\.actor\)/);assert.doesNotMatch(api,/json_extract\(content,'\$\.phone'\)|json_extract\(content,'\$\.email'\)|json_extract\(content,'\$\.note'\)/);
});

test('Access & Security is readable by governance but mutation stays privileged and provider authority cannot be globally granted',async()=>{
 const [reviews,roles]=await Promise.all([read('app/api/corporate/access-reviews/route.ts'),read('app/api/corporate/roles/route.ts')]);assert.match(reviews,/hasPermission\(user,'security:read'\)/);assert.match(reviews,/const user=await privilegedActor\(\)/);assert.match(reviews,/requirePrivilegedSession/);assert.match(reviews,/maskedRef\(row\.user_id\)/);assert.match(roles,/provider_owner.*provider_manager.*provider_staff/);assert.match(roles,/globallyManagedRoles/);assert.match(roles,/requirePrivilegedSession/);
});

test('Supabase scoped-authority migration is additive, RLS-bounded and projected separately',async()=>{
 const migration=await read('supabase/migrations/202609120001_phase3_scoped_corporate_authority.sql');assert.match(migration,/create table if not exists public\.platform_scoped_role_assignments/);assert.match(migration,/enable row level security/);assert.match(migration,/user_id = auth\.uid\(\)/);assert.match(migration,/'scoped_roles'/);assert.match(migration,/revoked_at is null/);assert.doesNotMatch(migration,/drop table|delete from/i);
 const identity=await read('lib/supabase-identity.ts');assert.match(identity,/scoped_roles/);assert.match(identity,/scopedRolesFrom/);assert.match(identity,/allowedScopes/);
});

test('Phase 4 D1 migration adds indexes only and does not duplicate canonical database truth',async()=>{
 const migration=(await read('drizzle/0017_corporate_control_plane_indexes.sql')).replaceAll('--> statement-breakpoint','');assert.doesNotMatch(migration,/CREATE TABLE/i);assert.doesNotMatch(migration,/INSERT INTO/i);const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE studio_bookings(id TEXT PRIMARY KEY,studio_id TEXT,customer TEXT,content TEXT);CREATE TABLE studio_members(id TEXT PRIMARY KEY,studio_id TEXT,customer TEXT,content TEXT);CREATE TABLE studio_issues(id TEXT PRIMARY KEY,content TEXT);");db.exec(migration);const indexes=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'studio_%' ORDER BY name").all().map(row=>String(row.name));for(const name of ['studio_bookings_status_created','studio_bookings_date_status','studio_bookings_customer_created','studio_members_status_created','studio_issues_status_created'])assert.ok(indexes.includes(name),name);db.close();
});

test('corporate control plane is desktop-dense, mobile-operable and PWA-safe',async()=>{
 const [css,manifest,layout,sw]=await Promise.all([read('app/corporate-v4.css'),read('public/manifest.webmanifest').then(JSON.parse),read('app/layout.tsx'),read('public/sw.js')]);assert.match(css,/\.c4-nav-shell\{position:sticky/);assert.match(css,/overflow-x:auto/);assert.match(css,/\.c4-department-grid/);assert.match(css,/@media \(max-width:720px\)/);assert.match(css,/\.c4-table td::before/);assert.match(css,/env\(safe-area-inset/);assert.equal(manifest.start_url,'/mobile');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'portrait-primary');assert.equal(manifest.theme_color,'#4169E1');assert.doesNotMatch(sw,/\/corporate/);assert.match(sw,/url\.pathname!=='\/api\/bookings\/offline'/);assert.ok(layout.indexOf("import './corporate-v4.css';")<layout.indexOf("import './brand-v1.css';"));
});

after(()=>rmSync(temp,{recursive:true,force:true}));
