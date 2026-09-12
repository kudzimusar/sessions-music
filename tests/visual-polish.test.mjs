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
  assert.ok(corporate > v2, 'the Phase 4 corporate layer must load after the customer surface');
  assert.ok(brand > corporate, 'the approved production brand layer must be the final design-system override');
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
  assert.match(css, /--primary:\s*var\(--sessions-royal\)/i);
  assert.match(css, /--foreground:\s*var\(--sessions-black\)/i);
  for (const legacy of ['#1f4e79','#2f80ed','#101828','#667085','#eef3f8','#245c78','#163c50','#162b35']) {
    assert.doesNotMatch(css.toLowerCase(), new RegExp(legacy), `legacy production colour ${legacy} must not enter the authoritative brand layer`);
  }
});

test('installed app identity uses the same approved brand', async () => {
  const manifest = JSON.parse(await read('public/manifest.webmanifest'));
  const favicon = await read('public/favicon.svg');
  assert.equal(manifest.background_color, '#FFFFFF');
  assert.equal(manifest.theme_color, '#4169E1');
  assert.match(favicon, /fill="#4169E1"/);
  assert.match(favicon, /stroke="#FFFFFF"/);
  assert.doesNotMatch(favicon.toLowerCase(), /#1f4e79|#2f80ed/);
});

test('Phase 1 remaps the legacy registry palette at the final production boundary', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /\.registry-app\s*\{[^}]*--r-blue:\s*var\(--sessions-royal\)/s);
  assert.match(css, /--r-deep:\s*var\(--sessions-black\)/);
  assert.match(css, /--r-ink:\s*var\(--sessions-black\)/);
  assert.match(css, /\.r-studio-brand\.rehearsal/);
  assert.match(css, /\.brand-period/);
  assert.match(css, /\.r-secondary/);
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

test('corporate brand layer keeps critical workflows mobile-usable', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /\[data-sessions-surface='corporate'\]/);
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
  assert.match(css, /--sessions-touch-target:\s*44px/);
  assert.match(css, /min-height:\s*var\(--sessions-touch-target\)/);
  assert.match(css, /overflow-x:\s*auto/);
  assert.match(css, /grid-template-columns:\s*1fr\s*!important/);
  assert.match(css, /textarea\s*\{[^}]*min-height:\s*96px/s);
});

test('rebuilt customer surface exposes marketplace-critical controls', async () => {
  const source = await read('app/sessions-v2.tsx');
  assert.match(source, /Provider approval only/);
  assert.match(source, /All recurring slots are valid/);
  assert.match(source, /Neighbourhood context, not fake pins/);
  assert.match(source, /Included room package/);
  assert.match(source, /Save room/);
});

test('visual system preserves focus, reduced-motion and forced-colour accessibility', async () => {
  const css = (await read('app/polish.css')) + '\n' + (await read('app/sessions-v2.css')) + '\n' + (await read('app/brand-v1.css'));
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px solid/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation-duration:\s*\.01ms/);
  assert.match(css, /transition-duration:\s*\.01ms/);
  assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
});
