import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-data-policy-'));
await build({entryPoints:[resolve('lib/data-access-policy.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'policy.mjs'),logLevel:'silent'});
const policy=await import(pathToFileURL(join(temp,'policy.mjs')));
const actor=(roles,memberships=[])=>({id:'actor-a',roles,memberships});
const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');

test('classifications describe sensitivity without becoming grants',()=>{
 assert.equal(policy.resourceClassification.workforce_directory,'internal');
 assert.equal(policy.resourceClassification.workforce_identity,'restricted');
 assert.equal(policy.resourceClassification.studio_verification_evidence,'restricted');
 assert.equal(policy.resourceClassification.settlement_proof,'restricted');
 assert.equal(policy.resourceClassification.booking_message_attachment,'confidential');
 assert.equal(policy.resourceClassification.private_upload,'confidential');
 assert.equal(policy.canReadPrivateMedia(null,'settlement_proof',{bookingCustomer:true}),false);
});

test('corporate directory visibility does not expose restricted workforce identity fields',()=>{
 const support=actor(['support_agent']);
 assert.equal(policy.canReadWorkforceField(support,'directory'),true);
 assert.equal(policy.canReadWorkforceField(support,'identity_user_id'),false);
 assert.equal(policy.canReadWorkforceField(support,'work_email'),false);
 assert.equal(policy.canReadWorkforceField(support,'employment_type'),false);
 const corporate=actor(['corporate_admin']);
 assert.equal(policy.canReadWorkforceField(corporate,'directory'),true);
 assert.equal(policy.canReadWorkforceField(corporate,'identity_user_id'),true);
 assert.equal(policy.canReadWorkforceField(corporate,'work_email'),true);
 const rootAdmin=actor(['super_admin']);
 assert.equal(policy.canReadWorkforceField(rootAdmin,'employment_type'),true);
});

test('trust and finance evidence permissions stay separated',()=>{
 const trust=actor(['trust_safety']);
 const finance=actor(['finance_admin']);
 assert.equal(policy.canReadPrivateMedia(trust,'studio_verification_evidence',{}),true);
 assert.equal(policy.canReadPrivateMedia(trust,'settlement_proof',{}),false);
 assert.equal(policy.canReadPrivateMedia(finance,'studio_verification_evidence',{}),false);
 assert.equal(policy.canReadPrivateMedia(finance,'settlement_proof',{}),true);
});

test('relationship scope grants the minimum private media required',()=>{
 const customer=actor(['musician']);
 const provider=actor(['provider_manager'],[{organizationId:'studio-a',role:'manager',active:true}]);
 assert.equal(policy.canReadPrivateMedia(customer,'settlement_proof',{bookingCustomer:true}),true);
 assert.equal(policy.canReadPrivateMedia(provider,'settlement_proof',{studioManager:true}),true);
 assert.equal(policy.canReadPrivateMedia(provider,'studio_verification_evidence',{studioOwner:false}),false);
 assert.equal(policy.canReadPrivateMedia(provider,'studio_verification_evidence',{studioOwner:true}),true);
 assert.equal(policy.canReadPrivateMedia(customer,'private_upload',{uploadOwner:true}),true);
 assert.equal(policy.canReadPrivateMedia(customer,'private_upload',{uploadOwner:false}),false);
});

test('corporate operations never inherit private booking-message attachments',()=>{
 const operations=actor(['operations_admin']);
 const musician=actor(['musician']);
 const provider=actor(['provider_manager']);
 assert.equal(policy.canReadPrivateMedia(operations,'booking_message_attachment',{bookingParticipantRole:'operations'}),false);
 assert.equal(policy.canReadPrivateMedia(operations,'booking_message_attachment',{}),false);
 assert.equal(policy.canReadPrivateMedia(musician,'booking_message_attachment',{bookingParticipantRole:'musician'}),true);
 assert.equal(policy.canReadPrivateMedia(provider,'booking_message_attachment',{bookingParticipantRole:'studio'}),true);
});

test('studio membership helper is active-tenant scoped',()=>{
 const principal=actor(['provider_manager'],[
  {organizationId:'studio-a',role:'manager',active:true},
  {organizationId:'studio-b',role:'owner',active:false},
 ]);
 assert.equal(policy.studioMembershipRole(principal,'studio-a'),'manager');
 assert.equal(policy.studioMembershipRole(principal,'studio-b'),null);
 assert.equal(policy.studioMembershipRole(principal,'studio-c'),null);
});

test('sensitive endpoints call the centralized field and media policy',async()=>{
 const [media,organization]=await Promise.all([read('app/api/media/[id]/route.ts'),read('app/api/corporate/organization/route.ts')]);
 assert.match(media,/canReadPrivateMedia/);
 assert.match(media,/studioMembershipRole/);
 assert.doesNotMatch(media,/isRegistryUserOperator/);
 assert.match(media,/bookingParticipantRole:access\.role/);
 assert.match(organization,/canReadWorkforceField\(actor,'directory'\)/);
 assert.match(organization,/canReadWorkforceField\(actor,'identity_user_id'\)/);
 assert.match(organization,/identityUserId:row\.user_id/);
});

after(()=>rmSync(temp,{recursive:true,force:true}));
