import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('runtime brand layer is loaded last and does not depend on host body attributes',async()=>{
  const [layout,css]=await Promise.all([read('app/layout.tsx'),read('app/brand-runtime.css')]);
  const brand=layout.indexOf("import './brand-v1.css';");
  const runtime=layout.indexOf("import './brand-runtime.css';");
  assert.ok(brand>=0);
  assert.ok(runtime>brand,'host-independent brand fallback must be the final CSS layer');
  assert.doesNotMatch(css,/body\[data-sessions-brand=['"]v1['"]\]/,'runtime fallback must not depend on a body attribute the Sites host may normalize');
});

test('production registry primitives are forced to the approved royal-blue visual identity',async()=>{
  const css=(await read('app/brand-runtime.css')).toLowerCase();
  assert.match(css,/\.registry-app\s*\{[^}]*--r-blue:\s*#4169e1/s);
  assert.match(css,/\.registry-app \.brand-symbol\s*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.match(css,/\.registry-app \.r-primary[^\{]*\{[^}]*background:\s*#4169e1\s*!important/s);
  assert.match(css,/\.registry-app \.r-bottom-nav a\.active[^\{]*\{[^}]*color:\s*#4169e1\s*!important/s);
  assert.doesNotMatch(css,/#245c78|#163c50|#162b35|#6cb3a3/,'runtime production layer must not reintroduce the legacy teal/slate palette');
});

test('release endpoint exposes a visual revision separate from the phase marker',async()=>{
  const [release,route]=await Promise.all([read('lib/release-info.ts'),read('app/api/release/route.ts')]);
  assert.match(release,/visualRevision:\s*'runtime-scope-1'/);
  assert.match(release,/brandPrimary:\s*'#4169E1'/);
  assert.match(route,/Response\.json\(SESSIONS_RELEASE/);
});
