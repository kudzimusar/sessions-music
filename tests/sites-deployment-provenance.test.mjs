import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('Sites hosting manifest remains linked to the Sessions project and canonical storage bindings',async()=>{
 const hosting=JSON.parse(await read('.openai/hosting.json'));
 assert.equal(hosting.project_id,'appgprj_6a9530e0c2548191b905ccc3a663dc4d');
 assert.equal(hosting.d1,'DB');
 assert.equal(hosting.r2,'BUCKET');
});

test('production build fails closed if Sites metadata or Phase 4/4.5/5 hardening migrations are not packaged',async()=>{
 const script=await read('scripts/build-verified.sh');
 assert.match(script,/dist\/.openai\/hosting\.json/);
 assert.match(script,/0017_corporate_control_plane_indexes\.sql/);
 assert.match(script,/0018_phase45_identity_onboarding\.sql/);
 assert.match(script,/0019_phase5_booking_ops_cases\.sql/);
 assert.match(script,/0020_staff_lifecycle_access\.sql/);
 assert.match(script,/0021_phase1_5_integrity_hardening\.sql/);
 assert.match(script,/Unexpected Sites project_id/);
 assert.match(script,/Expected DB\/R2 Sites bindings/);
});

test('running application exposes the Phase 5 release provenance marker',async()=>{
 const [release,route,layout]=await Promise.all([
  read('lib/release-info.ts'),
  read('app/api/release/route.ts'),
  read('app/layout.tsx'),
 ]);
 assert.match(release,/unified-platform-v1-phase5/);
 assert.match(release,/phase:\s*5/);
 assert.match(release,/phaseStatus:\s*'complete'/);
 assert.match(release,/#4169E1/);
 assert.match(route,/X-Sessions-Release/);
 assert.match(route,/SESSIONS_RELEASE/);
 assert.match(layout,/sessions-release/);
 assert.match(layout,/data-sessions-release/);
 assert.match(layout,/data-sessions-brand="v1"/);
});
