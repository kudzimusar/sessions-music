import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('visual layers load in the intended additive order', async () => {
  const layout = await read('app/layout.tsx');
  const globals = layout.indexOf("import './globals.css';");
  const registry = layout.indexOf("import './registry.css';");
  const expansion = layout.indexOf("import './expansion.css';");
  const polish = layout.indexOf("import './polish.css';");
  const v2 = layout.indexOf("import './sessions-v2.css';");

  assert.ok(globals >= 0, 'global application styles must remain loaded');
  assert.ok(registry > globals, 'registry styles must remain after global styles');
  assert.ok(expansion > registry, 'expansion styles must remain after registry styles');
  assert.ok(polish > expansion, 'shared polish must remain additive');
  assert.ok(v2 > polish, 'the rebuilt customer surface must load after shared polish');
});

test('production routes converge on one registry/account/authority domain', async () => {
  const route = await read('app/[...slug]/page.tsx');
  const guard = await read('app/production-route-guard.tsx');
  const corporate = await read('app/corporate-workspace.tsx');
  assert.match(route, /import SessionsApp from '\.\.\/sessions-v2';/);
  assert.match(route, /import CorporateWorkspace from '\.\.\/corporate-workspace';/);
  assert.match(route, /if\(path==='\/provider'\)redirect\('\/manage'\)/);
  assert.match(route, /if\(path==='\/admin'\)redirect\('\/corporate'\)/);
  assert.match(route, /if\(path==='\/bookings'\)redirect\('\/requests'\)/);
  assert.match(route, /if\(path==='\/profile'\)redirect\('\/account'\)/);
  assert.match(route, /const sandboxSurface=\['demo','saved','space','booking'\]/);
  assert.doesNotMatch(route, /const sandboxSurface=\[[^\]]*'admin'/);
  assert.match(route, /slug\[0\]==='corporate'.*AccessBoundary surface="corporate".*CorporateWorkspace/s);
  assert.match(route, /slug\[0\]==='registry-admin'.*AccessBoundary surface="corporate"/s);
  assert.match(guard, /'\/admin':'\/corporate'/);
  assert.match(guard, /'\/provider':'\/manage'/);
  assert.match(corporate, /SESSIONS CORPORATE/);
  assert.match(corporate, /platform:roles\.manage/);
  assert.match(corporate, /\/api\/corporate\/roles/);
});

test('visual polish keeps the Sessions palette and semantic success colour', async () => {
  const css = (await read('app/polish.css')) + '\n' + (await read('app/sessions-v2.css'));
  for (const token of ['#f7f9fc', '#ffffff', '#101828', '#667085', '#1f4e79', '#2f80ed', '#eef3f8']) {
    assert.match(css.toLowerCase(), new RegExp(token.replace('#', '#')));
  }
  assert.match(css, /--sessions-success:\s*#247a57/i);
});

test('phone navigation and booking action are safe-area aware with usable targets', async () => {
  const css = await read('app/polish.css');
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /\.mobile-nav\s*\{/);
  assert.match(css, /grid-template-columns:\s*repeat\(4,\s*1fr\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.mobile-nav button\s*\{[^}]*min-height:\s*54px/s);
  assert.match(css, /\.mobile-book-button\s*\{[^}]*position:\s*fixed/s);
});

test('rebuilt customer surface exposes marketplace-critical controls', async () => {
  const source = await read('app/sessions-v2.tsx');
  assert.match(source, /Provider approval only/);
  assert.match(source, /All recurring slots are valid/);
  assert.match(source, /Neighbourhood context, not fake pins/);
  assert.match(source, /Included room package/);
  assert.match(source, /Save room/);
});

test('visual polish preserves keyboard focus and reduced-motion support', async () => {
  const css = (await read('app/polish.css')) + '\n' + (await read('app/sessions-v2.css'));
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px solid/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
