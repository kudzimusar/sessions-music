import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const migration=await read('supabase/migrations/202609140003_phase1_5_data_api_authority_hardening.sql');

test('future Supabase Data API privileges fail closed by default',()=>{
 assert.match(migration,/revoke create on schema public from public, anon, authenticated/i);
 assert.match(migration,/alter default privileges for role postgres in schema public[\s\S]*revoke all on tables from anon, authenticated/i);
 assert.match(migration,/alter default privileges for role postgres in schema public[\s\S]*revoke execute on functions from public, anon, authenticated/i);
 assert.match(migration,/revoke all on table sessions_private\.identity_audit from public, anon, authenticated/i);
 assert.match(migration,/revoke execute on all functions in schema sessions_private from public, anon, authenticated/i);
});

test('device registration proves the real Auth session and never resurrects a revoked row',()=>{
 assert.match(migration,/from auth\.sessions s[\s\S]*s\.id = caller_session_id[\s\S]*s\.user_id = caller_id/i);
 assert.match(migration,/device_name is null or char_length\(trim\(device_name\)\) not between 1 and 80/i);
 assert.match(migration,/platform is null or platform not in \('web', 'android', 'ios'\)/i);
 assert.match(migration,/public\.device_sessions\.user_id = caller_id[\s\S]*public\.device_sessions\.revoked_at is null/i);
 assert.match(migration,/Device session has been revoked/);
});

test('device revocation is ownership-bound and idempotent',()=>{
 assert.match(migration,/select ds\.user_id, ds\.revoked_at[\s\S]*where ds\.session_id = target_session_id/i);
 assert.match(migration,/target_owner is null or target_owner <> caller_id/i);
 assert.match(migration,/if target_revoked_at is not null then[\s\S]*return true/i);
 assert.match(migration,/where session_id = target_session_id[\s\S]*user_id = caller_id[\s\S]*revoked_at is null/i);
 assert.match(migration,/device_session_revoked/);
});

test('authority-bearing tables remain read-only to authenticated clients',()=>{
 for(const table of ['platform_role_assignments','platform_scoped_role_assignments','organizations','organization_memberships','verified_contacts','device_sessions']){
  assert.match(migration,new RegExp(`revoke all on table public\\.${table} from anon, authenticated`,'i'));
  assert.match(migration,new RegExp(`grant select on table public\\.${table} to authenticated`,'i'));
 }
});

test('native verified sessions register the actual iOS or Android device before persistence/use',async()=>{
 const client=await read('native/sessions-native/src/supabase-client.js');
 assert.match(client,/client\.rpc\('register_current_device'/);
 assert.match(client,/device_name:native\.deviceName,platform:native\.platform/);
 assert.match(client,/Platform\.OS==='ios'.*platform:'ios'/s);
 assert.match(client,/Platform\.OS==='android'.*platform:'android'/s);
 assert.match(client,/await registerVerifiedNativeDevice\(client\);[\s\S]*persistVerifiedSupabaseSession/);
 assert.match(client,/await registerVerifiedNativeDevice\(client\);[\s\S]*return session/);
});

test('privileged administration fails closed unless the production device is registered',async()=>{
 const [access,route]=await Promise.all([read('lib/privileged-access.ts'),read('app/api/corporate/privileged/route.ts')]);
 assert.match(access,/user\.assuranceLevel!=='aal2'\|\|!user\.deviceRegistered/);
 assert.match(route,/eligible:actor\.method!=='chatgpt_demo'&&actor\.assuranceLevel==='aal2'&&actor\.deviceRegistered/);
 assert.match(route,/if\(!actor\.deviceRegistered\)return response\(\{error:'Register this signed-in device before privileged administration can be activated\.'/);
});
