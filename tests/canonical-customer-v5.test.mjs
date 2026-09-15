import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('desktop root mobile app and desktop account use three explicit non-competing surfaces',async()=>{
  const [rootPage,route]=await Promise.all([read('app/page.tsx'),read('app/[...slug]/page.tsx')]);
  assert.match(rootPage,/import RegistryApp from '\.\/registry'/);
  assert.match(rootPage,/return <RegistryApp path="\/"\/>/);
  assert.match(route,/import CustomerNative from '\.\.\/customer-native'/);
  assert.match(route,/import AccountSurface from '\.\.\/account-surface'/);
  assert.doesNotMatch(route,/CustomerV5/);
  assert.match(route,/if\(customerNativePath\)return <CustomerNative path=\{path\}\/>/);
  assert.match(route,/if\(path==='\/account'\)return <AccountSurface\/>/);
  assert.doesNotMatch(route,/\['studios','studio','map','mobile'/,'mobile must not be routed through RegistryApp');
});

test('desktop account surface reads the same registry and onboarding authorities',async()=>{
  const source=await read('app/account-surface.tsx');
  assert.match(source,/sessionFetch\('\/api\/registry'/);
  assert.match(source,/sessionFetch\('\/api\/onboarding'/);
  assert.match(source,/AccountSecurity/);
  assert.match(source,/data-sessions-surface="account-desktop"/);
  assert.doesNotMatch(source,/CustomerBottomNav|cv5-bottom-nav|MobileHome/);
  assert.doesNotMatch(source,/\/api\/state/);
});

test('desktop account retains marketplace relationships without duplicating authority',async()=>{
  const source=await read('app/account-surface.tsx');
  assert.match(source,/Active sessions/);
  assert.match(source,/Studio memberships/);
  assert.match(source,/Managed studios/);
  assert.match(source,/snapshot\?\.contexts/);
  assert.match(source,/data\.managedIds/);
  assert.match(source,/data\.claims/);
  assert.match(source,/data\.invitations/);
});

test('surface styles are ordered so client-specific composition and the boundary load after legacy desktop styles',async()=>{
  const layout=await read('app/layout.tsx');
  const runtime=layout.indexOf("import './brand-runtime.css';");
  const account=layout.indexOf("import './account-surface.css';");
  const native=layout.indexOf("import './customer-native.css';");
  const provider=layout.indexOf("import './provider-native.css';");
  const boundary=layout.indexOf("import './surface-boundaries.css';");
  assert.ok(account>runtime,'desktop account surface must load after legacy brand runtime');
  assert.ok(native>account,'customer native styles must load after account/legacy styles');
  assert.ok(provider>native,'provider native styles follow the customer native layer');
  assert.ok(boundary>provider,'explicit product-surface boundary must load last');
  assert.doesNotMatch(layout,/customer-v5\.css/,'obsolete customer V5 CSS must not remain in the production cascade');
});
