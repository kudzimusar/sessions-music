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

test('production registry primitives use the approved palette and canonical Sessions mark',async()=>{
  const css=activeCss(await read('app/brand-runtime.css')).toLowerCase();
  assert.match(css,/\.registry-app\s*\{[^}]*--r-blue:\s*#4169e1/s);
  assert.match(css,/\.registry-app \.brand-symbol\s*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.match(css,/\.registry-app \.brand-symbol::after\s*\{[^}]*background:\s*url\('\/favicon\.svg'\) center \/ cover no-repeat/s);
  assert.match(css,/\.registry-app \.brand-symbol svg\s*\{[^}]*opacity:\s*0\s*!important/s);
  assert.match(css,/\.registry-app \.r-primary[^\{]*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.match(css,/\.registry-app \.r-bottom-nav a\.active[^\{]*\{[^}]*color:\s*#4169e1\s*!important/s);
  assert.doesNotMatch(css,/#245c78|#163c50|#162b35|#6cb3a3/,'runtime production layer must not reintroduce the legacy teal/slate palette');
});

test('release endpoint exposes the shared Phase 1–5 native/desktop visual revision separately from the phase marker',async()=>{
  const [productCore,releaseAdapter,route]=await Promise.all([
    read('packages/product-core/index.js'),
    read('lib/release-info.ts'),
    read('app/api/release/route.ts'),
  ]);
  assert.match(productCore,/visualRevision:\s*'phase1-5-native-desktop-v2'/);
  assert.match(productCore,/brandPrimary:\s*'#4169E1'/);
  assert.match(productCore,/phase:\s*5\b/);
  assert.match(releaseAdapter,/SHARED_SESSIONS_RELEASE/);
  assert.match(route,/Response\.json\(SESSIONS_RELEASE/);
});
