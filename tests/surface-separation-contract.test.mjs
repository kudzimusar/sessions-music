import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('governing docs enforce native-mobile and desktop/PWA surface separation',()=>{
 const unified=read('docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md');
 const amendment=read('docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md');
 const agents=read('AGENTS.md');
 const pr=read('.github/pull_request_template.md');
 assert.match(unified,/Responsive web\/PWA views are not accepted as substitutes for the native mobile product/);
 assert.match(unified,/Corporate\/administrative surfaces are desktop\/tablet-first operational consoles/);
 assert.match(amendment,/Every implementation task must declare one or more of these surfaces/);
 assert.match(amendment,/Phase 10 remains the production native-runtime\/iOS\/Android architecture/);
 assert.match(agents,/Required surface declaration/);
 assert.match(pr,/Product surface declaration/);
});

test('public onboarding does not offer corporate self-selection',()=>{
 const gateway=read('app/onboarding-gateway.tsx');
 assert.doesNotMatch(gateway,/<strong>Sessions team member<\/strong>/);
 assert.doesNotMatch(gateway,/setIntention[^\n]*journey:'corporate'/);
 assert.match(gateway,/Internal Sessions company access is invitation-only and is not part of public onboarding/);
 assert.match(gateway,/This panel appears only because Sessions already has a trusted corporate invitation for this identity/);
});
