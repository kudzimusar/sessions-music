import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

const root=resolve(process.cwd());
const fail=message=>{console.error(`RELEASE GATE FAILED: ${message}`);process.exitCode=1};
const requiredFiles=[
  '.openai/hosting.json',
  'drizzle/0018_phase45_identity_onboarding.sql',
  'drizzle/0019_phase5_booking_ops_cases.sql',
  'drizzle/0020_staff_lifecycle_access.sql',
  'drizzle/0021_phase1_5_integrity_hardening.sql',
  'drizzle/0022_identity_mirror_hardening.sql',
  'supabase/migrations/202609130001_identity_contact_hardening.sql',
  'app/api/corporate/booking-ops/route.ts',
  'app/api/corporate/cases/route.ts',
  'app/api/corporate/staff-lifecycle/route.ts',
  'docs/PHASE-1-5-CROSS-PHASE-REVIEW.md',
  'docs/SITES-DEPLOYMENT-RUNBOOK.md',
  'packages/product-core/index.js',
];
for(const file of requiredFiles)if(!existsSync(resolve(root,file)))fail(`required release file is missing: ${file}`);

const hosting=JSON.parse(readFileSync(resolve(root,'.openai/hosting.json'),'utf8'));
if(hosting.project_id!=='appgprj_6a9530e0c2548191b905ccc3a663dc4d')fail('Sites project_id does not match the canonical Sessions Site');
if(hosting.d1!=='DB'||hosting.r2!=='BUCKET')fail('canonical D1/R2 bindings are missing');

const migrationFiles=readdirSync(resolve(root,'drizzle')).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
const migrationNumbers=migrationFiles.map(name=>name.slice(0,4));
if(new Set(migrationNumbers).size!==migrationNumbers.length)fail('duplicate numeric migration prefixes detected');
for(const required of ['0018_phase45_identity_onboarding.sql','0019_phase5_booking_ops_cases.sql','0020_staff_lifecycle_access.sql','0021_phase1_5_integrity_hardening.sql','0022_identity_mirror_hardening.sql'])if(!migrationFiles.includes(required))fail(`required migration is missing: ${required}`);

const d1IdentityHardening=readFileSync(resolve(root,'drizzle/0022_identity_mirror_hardening.sql'),'utf8');
if(!d1IdentityHardening.includes('sessions_verified_identity_contact_unique'))fail('D1 verified identity contact uniqueness is missing');
if(!d1IdentityHardening.includes('sessions_contact_one_primary_kind'))fail('D1 primary contact uniqueness is missing');

const identityHardening=readFileSync(resolve(root,'supabase/migrations/202609130001_identity_contact_hardening.sql'),'utf8');
if(/ON CONFLICT\s*\(kind,\s*value_normalized\)\s*DO UPDATE\s+SET\s+user_id\s*=\s*excluded\.user_id/is.test(identityHardening))fail('identity hardening must never transfer a verified contact to another user');
if(!identityHardening.includes('verified_contact_conflict'))fail('identity hardening no longer records contact ownership conflicts');
if(!identityHardening.includes("'session_registered'"))fail('trusted device registration posture is missing from current_identity');

// Release provenance is canonical in packages/product-core and is consumed by both
// web/PWA and the installed native client. Keep the gate pointed at that one source.
const releaseInfo=readFileSync(resolve(root,'packages/product-core/index.js'),'utf8');
if(!/id:\s*['"]unified-platform-v1-phase5['"]/.test(releaseInfo))fail('release provenance is stale: expected Phase 5 release id');
if(!/phase:\s*5\b/.test(releaseInfo))fail('release provenance is stale: expected phase 5');
if(!/phaseStatus:\s*['"]complete['"]/.test(releaseInfo))fail('release provenance does not declare Phase 5 complete');
if(!/brandPrimary:\s*['"]#4169E1['"]/.test(releaseInfo))fail('release provenance no longer declares canonical Royal Blue');
if(!/deploymentModel:\s*['"]chatgpt-sites-versioned['"]/.test(releaseInfo))fail('release provenance no longer declares versioned Sites deployment');
const webReleaseAdapter=readFileSync(resolve(root,'lib/release-info.ts'),'utf8');
if(!webReleaseAdapter.includes('SHARED_SESSIONS_RELEASE'))fail('web release metadata is no longer sourced from the shared product core');

const expectedSha=(process.env.SESSIONS_EXPECTED_SHA||'').trim();
if(expectedSha){
  const checkedOutSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if(checkedOutSha!==expectedSha)fail(`checked out revision ${checkedOutSha} does not equal expected immutable revision ${expectedSha}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log(`Release preflight passed for ${expectedSha||'local revision'}: canonical hosting, Phase 4.5/5 and cross-phase integrity migrations, identity hardening, review docs, shared cross-platform product core, and Phase 5 provenance are present.`);
