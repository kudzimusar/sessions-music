import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('native Phase 1-5 harness is an actual React Native runtime, not a WebView/PWA wrapper',()=>{
  const pkg=JSON.parse(read('native/sessions-native/package.json'));
  const app=read('native/sessions-native/App.js');
  assert.match(pkg.dependencies.expo,/^~57\./);
  assert.match(pkg.dependencies['react-native'],/^0\.86\./);
  assert.equal(pkg.dependencies['react-native-webview'],undefined);
  assert.doesNotMatch(app,/from\s+['"]react-native-webview['"]|require\(['"]react-native-webview['"]\)|<WebView\b|<iframe\b/i);
  assert.match(app,/Platform\.OS/);
  assert.match(app,/\/api\/release/);
});

test('native UAT identifiers and Phase 5 provenance are explicit',()=>{
  const config=JSON.parse(read('native/sessions-native/app.json')).expo;
  assert.equal(config.ios.bundleIdentifier,'com.sessionstech.sessions.uat');
  assert.equal(config.android.package,'com.sessionstech.sessions.uat');
  assert.equal(config.extra.sessionsPhase,5);
  assert.equal(config.extra.sessionsReleaseId,'unified-platform-v1-phase5');
  assert.equal(config.extra.sessionsVisualRevision,'phase1-5-native-desktop-v2');
});

test('native harness documentation preserves the authentication boundary',()=>{
  const doc=read('docs/NATIVE-PHASE1-5-SIMULATOR-HARNESS.md');
  assert.match(doc,/ChatGPT Sites `\/welcome` audience session is not a native authentication API/);
  assert.match(doc,/Supabase Auth/);
  assert.match(doc,/must never be used for Sessions testing/);
  assert.match(doc,/no WebView/i);
  assert.match(doc,/Stage N0/);
  assert.match(doc,/Stage N5/);
});
