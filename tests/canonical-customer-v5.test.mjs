import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('desktop root mobile app and account now use their intended separate surfaces',async()=>{
  const [rootPage,route]=await Promise.all([read('app/page.tsx'),read('app/[...slug]/page.tsx')]);
  assert.match(rootPage,/import RegistryApp from '\.\/registry'/);
  assert.match(rootPage,/return <RegistryApp path="\/"\/>/);
  assert.doesNotMatch(rootPage,/CustomerV5 path="\/mobile"/,'desktop root must not masquerade as the native mobile product');
  assert.match(route,/import CustomerNative from '\.\.\/customer-native'/);
  assert.match(route,/const customerNativePath=slug\[0\]==='mobile'&&!providerNativePath/);
  assert.match(route,/if\(customerNativePath\)return <CustomerNative path=\{path\}\/>/);
  assert.match(route,/if\(path==='\/account'\)return <CustomerV5 path="\/account"\/>/);
  assert.doesNotMatch(route,/\['studios','studio','map','mobile'/,'mobile must not be routed through the desktop RegistryApp route list');
});

test('customer account compatibility surface reads the real registry authority and never demo state',async()=>{
  const source=await read('app/customer-v5.tsx');
  assert.match(source,/sessionFetch\('\/api\/registry'/);
  assert.doesNotMatch(source,/\/api\/state/);
  assert.doesNotMatch(source,/initialState/);
  assert.match(source,/data-sessions-surface="customer-v5"/);
});

test('customer account surface retains real account security and marketplace relationship information',async()=>{
  const source=await read('app/customer-v5.tsx');
  for(const marker of ['cv5-account-hero','cv5-quick-actions','cv5-account-grid','cv5-security']){
    assert.ok(source.includes(marker),`missing ${marker}`);
  }
  assert.match(source,/Studio memberships/);
  assert.match(source,/Ownership & management/);
  assert.match(source,/AccountSecurity/);
});

test('native customer and customer account styles load after legacy runtime styles',async()=>{
  const [layout,accountCss,nativeCss]=await Promise.all([read('app/layout.tsx'),read('app/customer-v5.css'),read('app/customer-native.css')]);
  const runtime=layout.indexOf("import './brand-runtime.css';");
  const account=layout.indexOf("import './customer-v5.css';");
  const native=layout.indexOf("import './customer-native.css';");
  assert.ok(account>runtime,'customer account v5 must load after legacy runtime overrides');
  assert.ok(native>account,'native customer styles must load after account/legacy styles');
  for(const css of [accountCss,nativeCss]){
    assert.match(css,/#4169e1/i);
    assert.match(css,/background:#000/);
    assert.match(css,/background:#fff/);
    assert.doesNotMatch(css,/#245c78|#163c50|#162b35|#6cb3a3/i);
  }
});
