import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('CI verifies the immutable PR head and the merge candidate before exposing release-gate',async()=>{
 const ci=await read('.github/workflows/ci.yml');
 assert.match(ci,/verify-head:/);
 assert.match(ci,/ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(ci,/SESSIONS_EXPECTED_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(ci,/verify-merge:/);
 assert.match(ci,/release-gate:/);
 assert.match(ci,/needs:\s*\[verify-head, verify-merge\]/);
 assert.match(ci,/verify-main:/);
});

test('release preflight fails closed on wrong revision, wrong hosting or missing Phase 5 contract files',async()=>{
 const gate=await read('scripts/release-gate.mjs');
 assert.match(gate,/SESSIONS_EXPECTED_SHA/);
 assert.match(gate,/git.*rev-parse.*HEAD/s);
 assert.match(gate,/appgprj_6a9530e0c2548191b905ccc3a663dc4d/);
 assert.match(gate,/0018_phase45_identity_onboarding\.sql/);
 assert.match(gate,/0019_phase5_booking_ops_cases\.sql/);
 assert.match(gate,/app\/api\/corporate\/booking-ops\/route\.ts/);
 assert.match(gate,/app\/api\/corporate\/cases\/route\.ts/);
 assert.match(gate,/PHASE-1-5-CROSS-PHASE-REVIEW\.md/);
});

test('production build packages every migration required by the Phase 5 runtime',async()=>{
 const build=await read('scripts/build-verified.sh');
 for(const migration of ['0017_corporate_control_plane_indexes.sql','0018_phase45_identity_onboarding.sql','0019_phase5_booking_ops_cases.sql'])assert.match(build,new RegExp(migration.replaceAll('.','\\.')));
 assert.match(build,/required migration/);
});
