import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('Version 18 and 19 UAT findings remain historical evidence while Version 20 removes the exposed collisions',()=>{
  const native=read('app/customer-native.tsx');
  const onboarding=read('lib/onboarding-server.ts');
  const consolidation=read('docs/PHASE-1-5-CUSTOMER-SURFACE-CONSOLIDATION.md');
  assert.match(onboarding,/contexts:WorkspaceContext\[\]/);
  assert.match(native,/action:'setLastContext'/);
  assert.doesNotMatch(native,/One account, authorized contexts/);
  assert.doesNotMatch(native,/Same resources, different composition\./);
  assert.match(native,/studio\.rooms\.flatMap\(room=>room\.photos\|\|\[\]\)/);
  assert.match(consolidation,/Version 19 is therefore an audit baseline/);
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
  assert.match(agents,/Do not start Phase 6/);
});

test('Phase 1–5 closeout requires both iOS and Android installed-client review after Version 20 lands',()=>{
  const consolidation=read('docs/PHASE-1-5-CUSTOMER-SURFACE-CONSOLIDATION.md');
  assert.match(consolidation,/installed iOS\/Android binaries/);
  assert.match(consolidation,/PR #22 must rebase/);
  assert.match(consolidation,/installed iOS\/Android UAT/);
});

test('current correction remains Phase 5 and is separately identifiable as Version 20 consolidation source',()=>{
  const release=read('lib/release-info.ts');
  assert.match(release,/id: 'unified-platform-v1-phase5'/);
  assert.match(release,/phase: 5/);
  assert.match(release,/visualRevision: 'phase1-5-surface-consolidated-v20'/);
});
