import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  CUSTOMER_TABS,DESIGN_TOKENS,NATIVE_AUTH_BOUNDARY,PHASE_1_5_PARITY,
  REGISTRY_BOOKING_STATES,SESSIONS_RELEASE,SESSIONS_SURFACES,WORKSPACE_CONTEXTS,
  canTransitionRegistryBooking,releaseMatchesPhase5,
} from '../packages/product-core/index.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('shared product core declares all four Phase 1-5 clients and canonical release provenance',()=>{
  assert.deepEqual(SESSIONS_SURFACES,['ios-native','android-native','pwa','desktop-web']);
  assert.equal(SESSIONS_RELEASE.phase,5);
  assert.equal(SESSIONS_RELEASE.id,'unified-platform-v1-phase5');
  assert.equal(SESSIONS_RELEASE.visualRevision,'phase1-5-surface-consolidated-v20');
  assert.equal(releaseMatchesPhase5({...SESSIONS_RELEASE}),true);
  assert.equal(DESIGN_TOKENS.touchTarget.ios,44);
  assert.equal(DESIGN_TOKENS.touchTarget.android,48);
});

test('web release endpoint and native package consume shared portable resources instead of parallel release truth',()=>{
  const release=read('lib/release-info.ts');
  const nativePkg=JSON.parse(read('native/sessions-native/package.json'));
  assert.match(release,/packages\/product-core\/index\.js/);
  assert.match(release,/SHARED_SESSIONS_RELEASE/);
  assert.equal(nativePkg.dependencies['@sessions/product-core'],'file:../../packages/product-core');
});

test('shared navigation and identity semantics preserve customer/provider/corporate boundaries',()=>{
  assert.deepEqual(CUSTOMER_TABS.map(tab=>tab.key),['home','search','sessions','profile']);
  assert.equal(WORKSPACE_CONTEXTS.find(context=>context.type==='corporate')?.access,'authorized-only');
  assert.equal(NATIVE_AUTH_BOUNDARY.audienceGateIsNativeAuth,false);
  assert.equal(NATIVE_AUTH_BOUNDARY.browserCookieImportAllowed,false);
  assert.equal(NATIVE_AUTH_BOUNDARY.forbiddenProject,'svhxjfearcuqxikzvlyb');
});

test('shared Phase 5 booking transitions match registry status vocabulary and forbid invalid terminal transitions',()=>{
  assert.deepEqual(REGISTRY_BOOKING_STATES,['requested','confirmed','completed','declined','cancelled']);
  assert.equal(canTransitionRegistryBooking('requested','confirmed'),true);
  assert.equal(canTransitionRegistryBooking('requested','cancelled'),true);
  assert.equal(canTransitionRegistryBooking('confirmed','completed'),true);
  assert.equal(canTransitionRegistryBooking('completed','confirmed'),false);
  assert.equal(canTransitionRegistryBooking('declined','confirmed'),false);
});

test('cross-platform parity ledger is explicit about simulator testing and native auth certification',()=>{
  assert.equal(PHASE_1_5_PARITY[1].ios,'testing');
  assert.equal(PHASE_1_5_PARITY[1].android,'testing');
  assert.equal(PHASE_1_5_PARITY[1].pwa,'passed');
  assert.equal(PHASE_1_5_PARITY[1].desktop,'passed');
  assert.equal(PHASE_1_5_PARITY[4.5].ios,'testing');
  assert.equal(PHASE_1_5_PARITY[4.5].android,'testing');
});

test('repository rules require simultaneous iOS Android PWA desktop and shared-core accounting',()=>{
  const agents=read('AGENTS.md');
  const template=read('.github/pull_request_template.md');
  const doc=read('docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md');
  for(const text of [agents,template,doc]){
    assert.match(text,/iOS/i);
    assert.match(text,/Android/i);
    assert.match(text,/PWA/i);
    assert.match(text,/desktop/i);
  }
  assert.match(agents,/Mandatory four-client impact declaration/);
  assert.match(template,/Four-client impact/);
  assert.match(doc,/One product, four clients/);
  assert.match(doc,/does not authorize Phase 6/);
});
