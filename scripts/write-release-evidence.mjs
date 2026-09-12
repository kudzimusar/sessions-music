import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(process.cwd());
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const expected=(process.env.SESSIONS_EXPECTED_SHA||sha).trim();
if(sha!==expected)throw new Error(`Release evidence refused: HEAD ${sha} differs from expected ${expected}`);
const read=path=>readFileSync(resolve(root,path),'utf8');
const digest=path=>createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
const hosting=JSON.parse(read('.openai/hosting.json'));
const releaseSource=read('lib/release-info.ts');
const match=(name,pattern)=>{const value=releaseSource.match(pattern)?.[1];if(!value)throw new Error(`Release evidence refused: ${name} is missing from release-info.ts`);return value};
const migrations=['0017_corporate_control_plane_indexes.sql','0018_phase45_identity_onboarding.sql','0019_phase5_booking_ops_cases.sql','0020_staff_lifecycle_access.sql'];
const evidence={
 schemaVersion:1,
 repository:'kudzimusar/sessions-music',
 commit:sha,
 releaseId:match('release id',/id:\s*'([^']+)'/),
 phase:Number(match('phase',/phase:\s*(\d+)/)),
 phaseStatus:match('phase status',/phaseStatus:\s*'([^']+)'/),
 brand:match('brand',/brand:\s*'([^']+)'/),
 brandPrimary:match('brand primary',/brandPrimary:\s*'([^']+)'/),
 deploymentModel:match('deployment model',/deploymentModel:\s*'([^']+)'/),
 hosting:{projectId:hosting.project_id,d1:hosting.d1,r2:hosting.r2,sha256:digest('.openai/hosting.json')},
 migrations:Object.fromEntries(migrations.map(name=>[name,digest(`drizzle/${name}`)])),
 packageLockSha256:digest('package-lock.json'),
 generatedBy:'Sessions CI after successful release verification; contains no credentials',
};
writeFileSync(resolve(root,'release-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(`Release evidence written for ${sha}.`);
