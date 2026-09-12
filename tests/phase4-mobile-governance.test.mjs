import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');
const temp=mkdtempSync(join(tmpdir(),'sessions-c4-ownership-'));
await build({entryPoints:[resolve('lib/corporate-control-plane.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'modules.mjs'),logLevel:'silent'});
const control=await import(pathToFileURL(join(temp,'modules.mjs')));

test('corporate modules declare accountable owning departments and cross-office support',()=>{
 const byId=new Map(control.corporateModules.map(module=>[module.id,module]));
 assert.equal(byId.get('bookings')?.ownerDepartment,'Marketplace Operations');
 assert.deepEqual(byId.get('bookings')?.supportingDepartments,['Customer Support','Trust & Safety','Finance']);
 assert.equal(byId.get('customers')?.ownerDepartment,'Customer Support');
 assert.equal(byId.get('providers')?.ownerDepartment,'Provider Operations');
 assert.equal(byId.get('memberships')?.ownerDepartment,'Memberships & Retention');
 assert.equal(byId.get('finance')?.ownerDepartment,'Finance');
 assert.equal(byId.get('trust')?.ownerDepartment,'Trust & Safety');
 assert.equal(byId.get('analytics')?.ownerDepartment,'Data & Analytics');
 assert.equal(byId.get('audit')?.ownerDepartment,'Governance / Compliance');
 assert.equal(byId.get('access')?.ownerDepartment,'Governance / Security');
 for(const module of control.corporateModules)assert.ok(module.ownerDepartment?.trim(),`${module.id} needs operating ownership`);
});

test('module UI exposes ownership without turning department names into authorization grants',async()=>{
 const [ui,modules]=await Promise.all([read('app/corporate-control-plane.tsx'),read('lib/corporate-control-plane.ts')]);
 assert.match(ui,/Owner:<\/strong> \{definition\.ownerDepartment\}/);
 assert.match(ui,/definition\.supportingDepartments\.join\(' · '\)/);
 assert.match(modules,/contains no authorization grants|permissions still come from access-control/i);
 const authFn=modules.match(/export function canOpenCorporateModule[\s\S]*?\nexport function visibleCorporateModules/)?.[0]||'';
 assert.match(authFn,/module\.requiredPermissions\.every/);
 assert.doesNotMatch(authFn,/ownerDepartment|supportingDepartments/,'operating ownership metadata must never participate in RBAC evaluation');
});

test('PWA registration stays mobile-first and service worker never caches corporate or generic API traffic',async()=>{
 const [registry,sw,manifest]=await Promise.all([read('app/registry.tsx'),read('public/sw.js'),read('public/manifest.webmanifest').then(JSON.parse)]);
 assert.match(registry,/navigator\.serviceWorker\.register\('\/sw\.js'\)/);
 assert.equal(manifest.start_url,'/mobile');assert.equal(manifest.orientation,'portrait-primary');assert.equal(manifest.display,'standalone');
 assert.match(sw,/url\.pathname!=='\/api\/bookings\/offline'/);
 assert.doesNotMatch(sw,/\/corporate/);
 assert.doesNotMatch(sw,/caches\.match\(event\.request\).*corporate/s);
 assert.match(sw,/CLEAR_BOOKING_REFERENCE_CACHE/);
});

after(()=>rmSync(temp,{recursive:true,force:true}));
