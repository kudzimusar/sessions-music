import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NATIVE_AUTH_BOUNDARY} from '../packages/product-core/index.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('native identity is pinned to the active Sessions Music Supabase project and never church-os-dev',()=>{
  assert.equal(NATIVE_AUTH_BOUNDARY.projectName,'Sessions Music');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectRef,'ennfiyxlkvlmtkmibltz');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectUrl,'https://ennfiyxlkvlmtkmibltz.supabase.co');
  assert.equal(NATIVE_AUTH_BOUNDARY.region,'ap-northeast-1');
  assert.equal(NATIVE_AUTH_BOUNDARY.forbiddenProject,'svhxjfearcuqxikzvlyb');
  assert.equal(NATIVE_AUTH_BOUNDARY.status,'ready');
  assert.equal(NATIVE_AUTH_BOUNDARY.browserCookieImportAllowed,false);
});

test('auth config endpoint fails closed before publishing a wrong Supabase project',()=>{
  const route=read('app/api/auth/config/route.ts');
  assert.match(route,/NATIVE_AUTH_BOUNDARY\.projectUrl/);
  assert.match(route,/NATIVE_AUTH_BOUNDARY\.forbiddenProject/);
  assert.match(route,/Configured Supabase project does not match the verified Sessions identity authority/);
  assert.match(route,/enabled:configured/);
  assert.match(route,/projectRef:NATIVE_AUTH_BOUNDARY\.projectRef/);
});

test('native Supabase client independently rejects project drift and browser-cookie auth',()=>{
  const client=read('native/sessions-native/src/supabase-client.js');
  assert.match(client,/ref!==NATIVE_AUTH_BOUNDARY\.projectRef/);
  assert.match(client,/config\.url!==NATIVE_AUTH_BOUNDARY\.projectUrl/);
  assert.match(client,/ref===NATIVE_AUTH_BOUNDARY\.forbiddenProject/);
  assert.match(client,/detectSessionInUrl:false/);
  assert.match(client,/secureSupabaseStorage/);
  assert.doesNotMatch(client,/credentials\s*:\s*['"]include['"]/);
});
