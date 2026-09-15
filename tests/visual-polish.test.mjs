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
  assert.match(route, /import AccountSurface from '\.\.\/account-surface';/);
  assert.match(route, /import CorporateWorkspace from '\.\.\/corporate-workspace';/);
  assert.match(route, /if\(path==='\/provider'\)redirect\('\/manage'\)/);
  assert.match(route, /if\(path==='\/admin'\)redirect\('\/corporate'\)/);
  assert.match(route, /if\(path==='\/bookings'\)redirect\('\/requests'\)/);
  assert.match(route, /if\(path==='\/profile'\)redirect\('\/mobile\/profile'\)/);
  assert.match(route, /if\(path==='\/account'\)return <AccountSurface\/>/);
  assert.doesNotMatch(route, /CustomerV5/, 'the retired account/profile generation must not remain routable');
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
  assert.equal(manifest.theme_color, '#4169E1');
  assert.equal(manifest.background_color, '#FFFFFF');
  assert.match(favicon, /#4169E1/i);
});

test('Phase 1 remaps the legacy registry palette at the final production boundary', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /\.registry-app/);
  assert.match(css, /--accent:\s*var\(--sessions-royal\)/i);
});

test('phone navigation and booking action are safe-area aware with usable targets', async () => {
  const [css, customerCss] = await Promise.all([read('app/brand-v1.css'), read('app/customer-v5.css')]);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(customerCss, /env\(safe-area-inset-bottom\)/);
  assert.match(customerCss, /min-height:\s*44px/);
});

test('corporate brand layer keeps critical workflows mobile-usable', async () => {
  const css = await read('app/corporate-v4.css');
  assert.match(css, /@media\s*\(max-width:\s*720px\)/);
});

test('rebuilt customer surface exposes marketplace-critical controls', async () => {
  const source = await read('app/customer-v5.tsx');
  for (const text of ['Search','Sessions','Find a studio','Studio workspace']) assert.match(source, new RegExp(text));
});

test('visual system preserves focus, reduced-motion and forced-colour accessibility', async () => {
  const css = await read('app/brand-v1.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /forced-colors/);
});