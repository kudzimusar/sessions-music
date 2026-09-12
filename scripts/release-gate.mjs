import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';

const root=resolve(process.cwd());
const fail=message=>{console.error(`RELEASE GATE FAILED: ${message}`);process.exitCode=1};
const requiredFiles=[
  '.openai/hosting.json',
  'drizzle/0018_phase45_identity_onboarding.sql',
  'drizzle/0019_phase5_booking_ops_cases.sql',
  'app/api/corporate/booking-ops/route.ts',
  'app/api/corporate/cases/route.ts',
  'app/api/corporate/staff-lifecycle/route.ts',
  'docs/PHASE-1-5-CROSS-PHASE-REVIEW.md',
  'docs/SITES-DEPLOYMENT-RUNBOOK.md',
];
for(const file of requiredFiles)if(!existsSync(resolve(root,file)))fail(`required release file is missing: ${file}`);

const hosting=JSON.parse(readFileSync(resolve(root,'.openai/hosting.json'),'utf8'));
if(hosting.project_id!=='appgprj_6a9530e0c2548191b905ccc3a663dc4d')fail('Sites project_id does not match the canonical Sessions Site');
if(hosting.d1!=='DB'||hosting.r2!=='BUCKET')fail('canonical D1/R2 bindings are missing');

const migrationFiles=readdirSync(resolve(root,'drizzle')).filter(name=>/^\d{4}_.+\.sql$/.test(name)).sort();
const migrationNumbers=migrationFiles.map(name=>name.slice(0,4));
if(new Set(migrationNumbers).size!==migrationNumbers.length)fail('duplicate numeric migration prefixes detected');
for(const required of ['0018_phase45_identity_onboarding.sql','0019_phase5_booking_ops_cases.sql'])if(!migrationFiles.includes(required))fail(`required migration is missing: ${required}`);

const releaseInfo=readFileSync(resolve(root,'lib/release-info.ts'),'utf8');
if(!releaseInfo.includes("id: 'unified-platform-v1-phase5'"))fail('release provenance is stale: expected Phase 5 release id');
if(!/phase:\s*5\b/.test(releaseInfo))fail('release provenance is stale: expected phase 5');
if(!releaseInfo.includes("phaseStatus: 'complete'"))fail('release provenance does not declare Phase 5 complete');
if(!releaseInfo.includes("brandPrimary: '#4169E1'"))fail('release provenance no longer declares canonical Royal Blue');
if(!releaseInfo.includes("deploymentModel: 'chatgpt-sites-versioned'"))fail('release provenance no longer declares versioned Sites deployment');

const expectedSha=(process.env.SESSIONS_EXPECTED_SHA||'').trim();
if(expectedSha){
  const checkedOutSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if(checkedOutSha!==expectedSha)fail(`checked out revision ${checkedOutSha} does not equal expected immutable revision ${expectedSha}`);
}

if(process.exitCode)process.exit(process.exitCode);
console.log(`Release preflight passed for ${expectedSha||'local revision'}: canonical hosting, Phase 4.5/5 migrations and routes, review docs, and Phase 5 provenance are present.`);
