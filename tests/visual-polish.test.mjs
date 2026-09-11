import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('visual polish is loaded after the established application styles', async () => {
  const layout = await read('app/layout.tsx');
  const globals = layout.indexOf("import './globals.css';");
  const registry = layout.indexOf("import './registry.css';");
  const expansion = layout.indexOf("import './expansion.css';");
  const polish = layout.indexOf("import './polish.css';");

  assert.ok(globals >= 0, 'global application styles must remain loaded');
  assert.ok(registry > globals, 'registry styles must remain after global styles');
  assert.ok(expansion > registry, 'expansion styles must remain after registry styles');
  assert.ok(polish > expansion, 'polish layer must load last so it stays additive');
});

test('visual polish keeps the Sessions palette and semantic success colour', async () => {
  const css = await read('app/polish.css');
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

test('visual polish preserves keyboard focus and reduced-motion support', async () => {
  const css = await read('app/polish.css');
  assert.match(css, /:focus-visible/);
  assert.match(css, /outline:\s*3px solid/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
