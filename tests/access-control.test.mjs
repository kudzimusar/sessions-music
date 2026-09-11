import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-access-'));
await build({entryPoints:[resolve('lib/access-control.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'access.mjs'),logLevel:'silent'});
const access=await import(pathToFileURL(join(temp,'access.mjs')));
const actor=(roles,memberships=[])=>({roles,memberships});

test('customer accounts cannot enter provider or corporate surfaces',()=>{
 const customer=actor(['musician']);
 assert.equal(access.canAccessSurface(customer,'customer'),true);
 assert.equal(access.canAccessSurface(customer,'provider'),false);
 assert.equal(access.canAccessSurface(customer,'corporate'),false);
 assert.equal(access.canManagePlatformRoles(customer),false);
});

test('active organization membership grants provider surface without corporate authority',()=>{
 const manager=actor(['musician'],[{organizationId:'studio-a',role:'manager',active:true}]);
 assert.equal(access.canAccessSurface(manager,'provider'),true);
 assert.equal(access.canAccessSurface(manager,'corporate'),false);
});

test('finance and trust offices have separated permissions',()=>{
 const finance=actor(['finance_admin']);
 assert.equal(access.hasPermission(finance,'settlements:review'),true);
 assert.equal(access.hasPermission(finance,'fees:manage'),true);
 assert.equal(access.hasPermission(finance,'claims:review'),false);
 assert.equal(access.hasPermission(finance,'registry:write'),false);
 assert.equal(access.hasPermission(finance,'support:manage'),false);
 const trust=actor(['trust_safety']);
 assert.equal(access.hasPermission(trust,'claims:review'),true);
 assert.equal(access.hasPermission(trust,'verification:review'),true);
 assert.equal(access.hasPermission(trust,'fees:manage'),false);
 assert.equal(access.hasPermission(trust,'settlements:review'),false);
 assert.equal(access.hasPermission(trust,'support:manage'),false);
});

test('support can resolve support issues without inheriting finance or trust authority',()=>{
 const support=actor(['support_agent']);
 assert.equal(access.hasPermission(support,'support:read'),true);
 assert.equal(access.hasPermission(support,'support:manage'),true);
 assert.equal(access.hasPermission(support,'settlements:review'),false);
 assert.equal(access.hasPermission(support,'claims:review'),false);
 assert.equal(access.hasPermission(support,'providers:oversight'),false);
});

test('corporate administrators cannot manage role hierarchy',()=>{
 const corporate=actor(['corporate_admin']);
 assert.equal(access.canAccessSurface(corporate,'corporate'),true);
 assert.equal(access.canManagePlatformRoles(corporate),false);
 assert.equal(access.hasPermission(corporate,'fees:manage'),true);
 assert.equal(access.hasPermission(corporate,'support:manage'),true);
});

test('only super administrator receives every platform permission and role management',()=>{
 const root=actor(['super_admin']);
 assert.equal(access.canManagePlatformRoles(root),true);
 assert.equal(access.canAccessSurface(root,'corporate'),true);
 assert.equal(access.canAccessSurface(root,'provider'),true);
 for(const permission of access.platformPermissions)assert.equal(access.hasPermission(root,permission),true,permission);
});

after(()=>rmSync(temp,{recursive:true,force:true}));
