import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Version 18 UAT corrections keep one identity and one canonical resource model',()=>{
  const native=read('app/customer-native.tsx');
  const onboarding=read('lib/onboarding-server.ts');
  assert.match(onboarding,/One human has one Sessions identity|contexts:WorkspaceContext\[\]/i);
  assert.match(native,/One account, authorized contexts/);
  assert.match(native,/Same resources, different composition\./);
  assert.match(native,/studio\.rooms\.flatMap\(room=>room\.photos\|\|\[\]\)/);
});

test('provider monetization remains a documented Phase 6 requirement rather than fake Phase 5 behavior',()=>{
  const requirement=read('docs/PHASE-6-PROVIDER-MONETIZATION-REQUIREMENTS.md');
  const agents=read('AGENTS.md');
  assert.match(requirement,/Status: REQUIREMENT CAPTURED — NOT IMPLEMENTED/);
  assert.match(requirement,/featured studio placement/);
  assert.match(requirement,/clearly identifiable as sponsored, promoted or featured/);
  assert.match(requirement,/server-controlled and stored as integer money amounts/);
  assert.match(requirement,/Do not add a fake "boost", "featured", payment or sponsor control/);
  assert.match(agents,/PHASE-6-PROVIDER-MONETIZATION-REQUIREMENTS\.md/);
});

test('Version 18 UAT follow-up requires both iOS and Android simulator review',()=>{
  const findings=read('docs/VERSION-18-UAT-FINDINGS.md');
  assert.match(findings,/iOS simulator and an Android simulator/);
  assert.match(findings,/Customer bottom navigation must persist/);
  assert.match(findings,/canonical stored studio\/room media/);
  assert.match(findings,/crossOrigin="use-credentials"/);
});
