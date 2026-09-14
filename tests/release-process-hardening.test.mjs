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
 assert.match(ci,/persist-credentials:\s*false/g);
 assert.equal((ci.match(/npm ci --include=dev/g)||[]).length,3);
 assert.match(ci,/node_modules\/tw-animate-css\/dist\/tw-animate\.css/);
});

test('release CI dependencies are pinned to immutable upstream commit revisions',async()=>{
 const ci=await read('.github/workflows/ci.yml');
 assert.match(ci,/actions\/checkout@11d5960a326750d5838078e36cf38b85af677262/);
 assert.match(ci,/actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/);
 assert.match(ci,/actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
 assert.doesNotMatch(ci,/uses:\s+actions\/(?:checkout|setup-node|upload-artifact)@v\d/);
});

test('successful exact revisions publish machine-readable immutable release evidence',async()=>{
 const ci=await read('.github/workflows/ci.yml');
 const evidence=await read('scripts/write-release-evidence.mjs');
 assert.match(ci,/actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/);
 assert.match(ci,/sessions-release-evidence-\$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
 assert.match(ci,/sessions-release-evidence-main-\$\{\{ github\.sha \}\}/);
 assert.match(evidence,/SESSIONS_EXPECTED_SHA/);
 assert.match(evidence,/schemaVersion:2/);
 assert.match(evidence,/sha256/);
 assert.match(evidence,/packageLockSha256/);
 assert.match(evidence,/0019_phase5_booking_ops_cases\.sql/);
 assert.match(evidence,/0020_staff_lifecycle_access\.sql/);
 assert.match(evidence,/0021_phase1_5_integrity_hardening\.sql/);
 assert.match(evidence,/0022_identity_mirror_hardening\.sql/);
 assert.match(evidence,/supabaseMigrations/);
 assert.match(evidence,/202609130001_identity_contact_hardening\.sql/);
 assert.match(evidence,/contains no credentials/);
});

test('release preflight fails closed on wrong revision, wrong hosting, stale shared provenance or missing hardening contracts',async()=>{
 const [gate,productCore,releaseAdapter]=await Promise.all([
  read('scripts/release-gate.mjs'),
  read('packages/product-core/index.js'),
  read('lib/release-info.ts'),
 ]);
 assert.match(gate,/SESSIONS_EXPECTED_SHA/);
 assert.match(gate,/git.*rev-parse.*HEAD/s);
 assert.match(gate,/appgprj_6a9530e0c2548191b905ccc3a663dc4d/);
 assert.match(gate,/0018_phase45_identity_onboarding\.sql/);
 assert.match(gate,/0019_phase5_booking_ops_cases\.sql/);
 assert.match(gate,/0020_staff_lifecycle_access\.sql/);
 assert.match(gate,/0021_phase1_5_integrity_hardening\.sql/);
 assert.match(gate,/0022_identity_mirror_hardening\.sql/);
 assert.match(gate,/202609130001_identity_contact_hardening\.sql/);
 assert.match(gate,/verified_contact_conflict/);
 assert.match(gate,/session_registered/);
 assert.match(gate,/app\/api\/corporate\/booking-ops\/route\.ts/);
 assert.match(gate,/app\/api\/corporate\/cases\/route\.ts/);
 assert.match(gate,/PHASE-1-5-CROSS-PHASE-REVIEW\.md/);
 assert.match(gate,/packages\/product-core\/index\.js/);
 assert.match(gate,/expected Phase 5 release id/);
 assert.match(gate,/expected phase 5/);
 assert.match(gate,/release provenance does not declare Phase 5 complete/);
 assert.match(gate,/web release metadata is no longer sourced from the shared product core/);
 assert.match(productCore,/id:\s*'unified-platform-v1-phase5'/);
 assert.match(productCore,/phase:\s*5\b/);
 assert.match(productCore,/phaseStatus:\s*'complete'/);
 assert.match(productCore,/deploymentModel:\s*'chatgpt-sites-versioned'/);
 assert.match(releaseAdapter,/SHARED_SESSIONS_RELEASE/);
});

test('production build packages every D1 migration required by the Phase 5 runtime',async()=>{
 const build=await read('scripts/build-verified.sh');
 for(const migration of ['0017_corporate_control_plane_indexes.sql','0018_phase45_identity_onboarding.sql','0019_phase5_booking_ops_cases.sql','0020_staff_lifecycle_access.sql','0021_phase1_5_integrity_hardening.sql','0022_identity_mirror_hardening.sql'])assert.match(build,new RegExp(migration.replaceAll('.','\\.')));
 assert.match(build,/required migration/);
});
