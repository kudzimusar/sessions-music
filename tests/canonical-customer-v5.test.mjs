import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('desktop root native mobile profile and account security use intended compositions',async()=>{
  const [rootPage,route]=await Promise.all([read('app/page.tsx'),read('app/[...slug]/page.tsx')]);
  assert.match(rootPage,/import RegistryApp from '\.\/registry'/);
  assert.match(rootPage,/return <RegistryApp path="\/"\/>/);
  assert.doesNotMatch(rootPage,/CustomerV5 path="\/mobile"/,'desktop root must not masquerade as the native mobile product');
  assert.match(route,/import CustomerNative from '\.\.\/customer-native'/);
  assert.match(route,/import AccountSurface from '\.\.\/account-surface'/);
  assert.match(route,/const customerNativePath=slug\[0\]==='mobile'&&!providerNativePath/);
  assert.match(route,/if\(customerNativePath\)return <CustomerNative path=\{path\}\/>/);
  assert.match(route,/if\(path==='\/account'\)return <AccountSurface\/>/);
  assert.match(route,/if\(path==='\/profile'\)redirect\('\/mobile\/profile'\)/,'legacy profile alias must land on the canonical profile hub');
  assert.doesNotMatch(route,/CustomerV5 path="\/account"/,'the retired account hub must not remain routable');
  assert.doesNotMatch(route,/\['studios','studio','map','mobile'/,'mobile must not be routed through the desktop RegistryApp route list');
});

test('account route is a security detail surface rather than a second profile home',async()=>{
  const source=await read('app/account-surface.tsx');
  assert.match(source,/data-account-contract="unified-profile-v1"/);
  assert.match(source,/data-sessions-surface="account-security"/);
  assert.match(source,/sessionFetch\('\/api\/registry'/);
  assert.match(source,/YOUR SESSIONS IDENTITY/);
  assert.match(source,/Account & security/);
  assert.match(source,/AccountSecurity/);
  assert.match(source,/href="\/mobile\/profile"/);
  assert.match(source,/src="\/favicon\.svg"/);
  assert.doesNotMatch(source,/Find a studio|My sessions|Studio workspace|Updates/,'account security must not duplicate the profile/home quick-action architecture');
  assert.doesNotMatch(source,/label:'You'/,'account navigation must not revive the old You taxonomy');
});

test('native profile remains the mobile identity hub and links account security as a detail',async()=>{
  const source=await read('app/customer-native.tsx');
  assert.match(source,/NativeTopBar title="Profile"/);
  assert.match(source,/YOUR SESSIONS IDENTITY/);
  assert.match(source,/One account, authorized contexts/);
  assert.match(source,/href="\/account"/);
  assert.match(source,/Account & security/);
  assert.match(source,/\['\/mobile\/profile','Profile',UserRound\]/);
  assert.doesNotMatch(source,/label:'You'/);
});

test('unified account and native customer styles load after legacy runtime styles',async()=>{
  const [layout,accountCss,nativeCss]=await Promise.all([read('app/layout.tsx'),read('app/account-surface.css'),read('app/customer-native.css')]);
  const runtime=layout.indexOf("import './brand-runtime.css';");
  const native=layout.indexOf("import './customer-native.css';");
  const account=layout.indexOf("import './account-surface.css';");
  assert.ok(native>runtime,'native customer styles must load after legacy runtime overrides');
  assert.ok(account>native,'unified account surface must load after native identity styles');
  for(const css of [accountCss,nativeCss]){
    assert.match(css,/#4169e1/i);
    assert.match(css,/#000/i);
    assert.match(css,/#fff/i);
    assert.doesNotMatch(css,/#245c78|#163c50|#162b35|#6cb3a3/i);
  }
});