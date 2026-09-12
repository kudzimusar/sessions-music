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
  const corporate = layout.indexOf("import './corporate-v4.css';");
  const brand = layout.indexOf("import './brand-v1.css';");

  assert.ok(globals >= 0, 'global application styles must remain loaded');
  assert.ok(registry > globals, 'registry styles must remain after global styles');
  assert.ok(expansion > registry, 'expansion styles must remain after registry styles');
  assert.ok(polish > expansion, 'shared polish must remain additive');
  assert.ok(v2 > polish, 'the rebuilt customer surface must load after shared polish');
  assert.ok(corporate > v2, 'the corporate Phase 4 layer must load after the customer surface');
  assert.ok(brand > corporate, 'the approved production brand layer must remain the final design-system override');
  assert.match(layout, /themeColor:'#4169E1'/);
  assert.match(layout, /<body[^>]*data-sessions-brand="v1"[^>]*>/);
  assert.match(layout, /data-sessions-release=\{SESSIONS_RELEASE\.id\}/);
  assert.doesNotMatch(layout, /\/og\.png/, 'unreviewed generic social imagery must not be advertised');
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
  assert.match(route, /data-sessions-surface="corporate"/);
  assert.match(guard, /'\/admin':'\/corporate'/);
  assert.match(guard, /'\/provider':'\/manage'/);
  assert.match(corporate, /SESSIONS CORPORATE/);
  assert.match(corporate, /platform:roles\.manage/);
  assert.match(corporate, /\/api\/corporate\/roles/);
});

test('approved production brand is Black, Royal Blue and White with semantic status colours', async () => {
  const css = await read('app/brand-v1.css');
  for (const token of ['--sessions-black: #000000', '--sessions-royal: #4169e1', '--sessions-white: #ffffff']) {
    assert.match(css.toLowerCase(), new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /--sessions-success:\s*#247a57/i);
  assert.match(css, /--sessions-warning:\s*#a15c00/i);
  assert.match(css, /--sessions-danger:\s*#b42318/i);
});

test('installed app identity uses the same approved brand', async () => {
  const [manifest, favicon, layout] = await Promise.all([
    read('public/manifest.webmanifest'),
    read('public/favicon.svg'),
    read('app/layout.tsx'),
  ]);
  const parsed = JSON.parse(manifest);
  assert.equal(parsed.theme_color, '#4169E1');
  assert.equal(parsed.background_color, '#FFFFFF');
  assert.match(favicon, /#4169E1/i);
  assert.match(layout, /themeColor:'#4169E1'/);
});

test('Phase 1 remaps the legacy registry palette at the final production boundary', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /body\[data-sessions-brand='v1'\] \.registry-app\s*\{/);
  assert.match(css, /--r-blue:\s*var\(--sessions-royal\)/);
  assert.match(css, /--r-deep:\s*var\(--sessions-black\)/);
  assert.match(css, /--r-ink:\s*var\(--sessions-black\)/);
});

test('phone navigation and booking action are safe-area aware with usable targets', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /--sessions-touch-target:\s*44px/);
});

test('corporate brand layer keeps critical workflows mobile-usable', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /\[data-sessions-surface='corporate'\]/);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
});

test('rebuilt customer surface exposes marketplace-critical controls', async () => {
  const app = await read('app/sessions-v2.tsx');
  for (const expected of ['Explore spaces','Find a rehearsal room','Near me','Map','List']) assert.match(app, new RegExp(expected));
});

test('visual system preserves focus, reduced-motion and forced-colour accessibility', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /forced-colors:\s*active/);
});
