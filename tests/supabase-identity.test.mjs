import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-supabase-identity-'));
globalThis.__supabaseIdentity={env:{SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-publishable'}};
const plugin={name:'supabase-identity-fixture',setup(bundle){bundle.onResolve({filter:/cloudflare:workers/},()=>({path:'runtime',namespace:'fixture'}));bundle.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const env=globalThis.__supabaseIdentity.env;',loader:'js'}))}};
await build({entryPoints:[resolve('lib/supabase-identity.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'identity.mjs'),plugins:[plugin],logLevel:'silent'});
const{authenticateSupabase}=await import(pathToFileURL(join(temp,'identity.mjs')));
const originalFetch=globalThis.fetch;
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=(expiry=Math.floor(Date.now()/1000)+300)=>`${encode({alg:'none'})}.${encode({exp:expiry})}.fixture`;
const headers=value=>new Headers(value?{Authorization:'Bearer '+value}:{});
const userId='11111111-1111-4111-8111-111111111111',sessionId='22222222-2222-4222-8222-222222222222';
const responses=(context={})=>{let count=0;globalThis.fetch=async url=>{count++;if(String(url).endsWith('/auth/v1/user'))return Response.json({id:userId,phone:'+263771234567',app_metadata:{provider:'phone'}});return Response.json({user_id:userId,display_name:'Fixture Musician',session_id:sessionId,session_revoked:false,verified_phone:'+263771234567',verified_email:null,roles:['musician','provider_owner','client-injected-role'],memberships:[{studio_id:'studio-a',role:'owner',active:true},{studio_id:'studio-b',role:'manager',active:false}],...context})};return()=>count};

test('missing bearer never reaches Supabase',async()=>{let calls=0;globalThis.fetch=async()=>{calls++;return new Response(null,{status:500})};assert.equal(await authenticateSupabase(headers()),null);assert.equal(calls,0)});
test('verified Auth user and RLS identity context create a bounded principal',async()=>{responses();const principal=await authenticateSupabase(headers(token()));assert.equal(principal.userId,userId);assert.equal(principal.sessionId,sessionId);assert.equal(principal.method,'phone_otp');assert.deepEqual(principal.roles,['musician','provider_owner']);assert.deepEqual(principal.memberships,[{organizationId:'studio-a',role:'owner',active:true},{organizationId:'studio-b',role:'staff',active:false}])});
test('expired token, revoked session and user mismatch fail closed',async()=>{let calls=responses();assert.equal(await authenticateSupabase(headers(token(Math.floor(Date.now()/1000)-1))),null);assert.equal(calls(),2);responses({session_revoked:true});assert.equal(await authenticateSupabase(headers(token())),null);responses({user_id:'33333333-3333-4333-8333-333333333333'});assert.equal(await authenticateSupabase(headers(token())),null)});
test('Supabase 401 responses are unauthenticated, not server errors',async()=>{globalThis.fetch=async()=>new Response(null,{status:401});assert.equal(await authenticateSupabase(headers(token())),null)});

after(()=>{globalThis.fetch=originalFetch;rmSync(temp,{recursive:true,force:true});delete globalThis.__supabaseIdentity});
