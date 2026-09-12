import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');

test('provider roles and legacy permanent super admin cannot be newly granted from corporate controls',async()=>{
 const [route,workspace]=await Promise.all([read('app/api/corporate/roles/route.ts'),read('app/corporate-workspace.tsx')]);
 assert.match(route,/provider_owner','provider_manager','provider_staff','super_admin'/);
 assert.match(route,/super_admin_eligible/);
 assert.match(route,/legacy super_admin is retained for migration compatibility/);
 assert.doesNotMatch(workspace,/\['super_admin','Legacy super administrator'\]/);
 assert.match(workspace,/\['super_admin_eligible','Super administrator eligible'\]/);
 assert.match(workspace,/legacy permanent Super Admin authority are intentionally not assignable here/);
});
