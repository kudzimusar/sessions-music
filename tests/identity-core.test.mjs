import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-identity-'));
await build({entryPoints:[resolve('lib/identity-core.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'identity.mjs'),logLevel:'silent'});
const identity=await import(pathToFileURL(join(temp,'identity.mjs')));
const now=Date.now();
const principal=(patch={})=>({userId:'user-1',sessionId:'session-1',expiresAt:now+60_000,revoked:false,method:'phone_otp',verifiedPhone:'+263771234567',verifiedEmail:null,roles:['musician'],memberships:[],...patch});

test('Zimbabwe phone numbers normalize to one E.164 identity',()=>{
 for(const value of ['0771234567','263771234567','+263 77 123 4567','00263 (77) 123-4567'])assert.equal(identity.normalizeZimbabwePhone(value),'+263771234567');
 for(const value of ['771234567','+263071234567','+27111234567','not-a-number'])assert.throws(()=>identity.normalizeZimbabwePhone(value));
});

test('OTP input is exactly six digits',()=>{assert.equal(identity.isSixDigitOtp('123456'),true);for(const value of ['12345','1234567','12 3456','abcdef'])assert.equal(identity.isSixDigitOtp(value),false)});

test('expired and revoked sessions fail before authorization',()=>{
 assert.throws(()=>identity.requireActiveSession(principal({expiresAt:now-1}),now),error=>error.status===401);
 assert.throws(()=>identity.requireActiveSession(principal({revoked:true}),now),error=>error.status===401);
});

test('a client-visible musician role cannot escalate to operations',()=>{
 assert.throws(()=>identity.requirePlatformRole(principal(),['operations_admin'],now),error=>error.status===403);
 assert.equal(identity.requirePlatformRole(principal(),['musician'],now).userId,'user-1');
});

test('provider staff cannot cross organization boundaries',()=>{
 const staff=principal({roles:['provider_staff'],memberships:[{organizationId:'studio-a',role:'staff',active:true}]});
 assert.equal(identity.requireOrganizationAccess(staff,'studio-a',['staff'],now).userId,'user-1');
 assert.throws(()=>identity.requireOrganizationAccess(staff,'studio-b',['staff'],now),error=>error.status===403);
 assert.throws(()=>identity.requireOrganizationAccess(staff,'studio-a',['owner'],now),error=>error.status===403);
});

test('operations access is explicit and verified contacts are required separately',()=>{
 const operator=principal({roles:['operations_admin'],verifiedPhone:null,verifiedEmail:'operator@example.test'});
 assert.equal(identity.requireOrganizationAccess(operator,'any-studio',['owner'],now).userId,'user-1');
 assert.equal(identity.hasVerifiedContact(operator),true);
 assert.equal(identity.hasVerifiedContact(principal({verifiedPhone:null,verifiedEmail:null})),false);
});

after(()=>rmSync(temp,{recursive:true,force:true}));
