import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('site root, account and mobile no longer render the legacy RegistryApp shell',async()=>{
  const [rootPage,route]=await Promise.all([read('app/page.tsx'),read('app/[...slug]/page.tsx')]);
  assert.match(rootPage,/import CustomerV5 from '\.\/customer-v5'/);
  assert.match(rootPage,/return <CustomerV5 path="\/mobile"\/>/);
  assert.doesNotMatch(rootPage,/RegistryApp/,'the reviewable Site link must not open the legacy registry shell');
  assert.match(route,/if\(path==='\/mobile'\)return <CustomerV5 path="\/mobile"\/>/);
  assert.match(route,/if\(path==='\/account'\)return <CustomerV5 path="\/account"\/>/);
  assert.doesNotMatch(route,/\['studios','studio','map','mobile'/,'mobile must be removed from the legacy RegistryApp route list');
  assert.doesNotMatch(route,/notifications','account','planner/,'account must be removed from the legacy RegistryApp route list');
});

test('canonical customer v5 reads the real registry authority and never the demo state API',async()=>{
  const source=await read('app/customer-v5.tsx');
  assert.match(source,/sessionFetch\('\/api\/registry'/);
  assert.doesNotMatch(source,/\/api\/state/);
  assert.doesNotMatch(source,/initialState/);
  assert.match(source,/data-sessions-surface="customer-v5"/);
});

test('new customer surfaces expose the rebuilt account and mobile information architecture',async()=>{
  const source=await read('app/customer-v5.tsx');
  for(const marker of ['cv5-mobile-hero','cv5-search','cv5-studio-list','cv5-account-hero','cv5-quick-actions','cv5-account-grid','cv5-security','cv5-bottom-nav']){
    assert.ok(source.includes(marker),`missing ${marker}`);
  }
  assert.match(source,/Studio memberships/);
  assert.match(source,/Ownership & management/);
  assert.match(source,/Your next session/);
  assert.match(source,/AccountSecurity/);
});

test('customer v5 is a distinct Royal Blue Black White design system loaded after legacy runtime styles',async()=>{
  const [layout,css]=await Promise.all([read('app/layout.tsx'),read('app/customer-v5.css')]);
  const runtime=layout.indexOf("import './brand-runtime.css';");
  const customer=layout.indexOf("import './customer-v5.css';");
  assert.ok(customer>runtime,'customer v5 must load after legacy runtime overrides');
  assert.match(css,/#4169e1/i);
  assert.match(css,/background:#000/);
  assert.match(css,/background:#fff/);
  assert.doesNotMatch(css,/#245c78|#163c50|#162b35|#6cb3a3/i);
});
