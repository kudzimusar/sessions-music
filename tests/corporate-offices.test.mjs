import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');

test('corporate offices are routed through explicit permission boundaries',async()=>{
 const route=await read('app/[...slug]/page.tsx');
 assert.match(route,/office="trust"/);assert.match(route,/requiredPermissions=\{\['claims:review','verification:review'\]\}/);
 assert.match(route,/office="finance"/);assert.match(route,/requiredPermissions=\{\['settlements:review'\]\}/);
 assert.match(route,/office="support"/);assert.match(route,/requiredPermissions=\{\['support:read'\]\}/);
 assert.match(route,/office="providers"/);assert.match(route,/requiredPermissions=\{\['providers:oversight'\]\}/);
});

test('office queues enforce their own server permissions',async()=>{
 const trust=await read('app/api/corporate/trust/route.ts'),providers=await read('app/api/corporate/providers/route.ts'),support=await read('app/api/corporate/support/route.ts');
 assert.match(trust,/hasPermission\(user,'claims:review'\)/);assert.match(trust,/hasPermission\(user,'verification:review'\)/);
 assert.match(providers,/hasPermission\(user,'providers:oversight'\)/);
 assert.match(support,/hasPermission\(user,'support:read'\)/);assert.match(support,/hasPermission\(user,'support:manage'\)/);
});

test('Finance capabilities are enforced independently of general Operations',async()=>{
 const settlements=await read('app/api/settlements/route.ts'),fees=await read('app/api/fee-policies/route.ts'),loyalty=await read('app/api/loyalty-credit/route.ts'),media=await read('app/api/media/[id]/route.ts');
 assert.match(settlements,/hasPermission\(user,'settlements:review'\)/);
 assert.match(fees,/hasPermission\(user,'fees:manage'\)/);
 assert.match(loyalty,/hasPermission\(user,'loyalty:manage'\)/);
 assert.match(media,/hasPermission\(user,'verification:review'\)/);assert.match(media,/hasPermission\(user,'settlements:review'\)/);
 assert.match(media,/access\.role==='operations'/,'corporate authority must not expose private booking-message attachments');
});
