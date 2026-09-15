import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const activeCss=css=>css.replace(/\/\*[\s\S]*?\*\//g,'');

test('runtime brand layer is loaded after brand v1 and does not depend on host body attributes',async()=>{
  const [layout,css]=await Promise.all([read('app/layout.tsx'),read('app/brand-runtime.css')]);
  const brand=layout.indexOf("import './brand-v1.css';");
  const runtime=layout.indexOf("import './brand-runtime.css';");
  assert.ok(brand>=0);
  assert.ok(runtime>brand,'host-independent registry brand fallback must load after brand v1');
  assert.doesNotMatch(activeCss(css),/body\[data-sessions-brand=['"]v1['"]\]/,'runtime fallback must not depend on a body attribute the Sites host may normalize');
});

test('production registry primitives keep approved palette while the explicit surface boundary retires registry phone navigation',async()=>{
  const [css,boundary]=await Promise.all([read('app/brand-runtime.css'),read('app/surface-boundaries.css')]);
  const runtime=activeCss(css).toLowerCase();
  assert.match(runtime,/\.registry-app\s*\{[^}]*--r-blue:\s*#4169e1/s);
  assert.match(runtime,/\.registry-app \.brand-symbol\s*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.match(runtime,/\.registry-app \.brand-symbol::after\s*\{[^}]*background:\s*url\('\/favicon\.svg'\) center \/ cover no-repeat/s);
  assert.match(runtime,/\.registry-app \.brand-symbol svg\s*\{[^}]*opacity:\s*0\s*!important/s);
  assert.match(runtime,/\.registry-app \.r-primary[^\{]*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.doesNotMatch(runtime,/#245c78|#163c50|#162b35|#6cb3a3/,'runtime production layer must not reintroduce the legacy teal/slate palette');
  assert.match(boundary,/\.registry-app \.r-bottom-nav\{display:none!important\}/,'Registry mobile nav is historical CSS only, not a product surface');
});

test('native product identity does not confuse the browser favicon with the in-product logo',async()=>{
  const [customer,provider]=await Promise.all([read('app/customer-native.tsx'),read('app/provider-native.tsx')]);
  assert.match(customer,/AudioLines/);
  assert.match(customer,/cn-brand-symbol/);
  assert.doesNotMatch(customer,/src="\/favicon\.svg"/);
  assert.match(provider,/AudioLines/);
  assert.match(provider,/pn-provider-mark/);
});

test('release endpoint exposes Version 20 consolidation separately from the Phase 5 marker',async()=>{
  const [release,route]=await Promise.all([read('lib/release-info.ts'),read('app/api/release/route.ts')]);
  assert.match(release,/visualRevision:\s*'phase1-5-surface-consolidated-v20'/);
  assert.match(release,/phase:\s*5/);
  assert.match(release,/brandPrimary:\s*'#4169E1'/);
  assert.match(route,/Response\.json\(SESSIONS_RELEASE/);
});
