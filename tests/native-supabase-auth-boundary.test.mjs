import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NATIVE_AUTH_BOUNDARY} from '../packages/product-core/index.js';

const read=path=>readFileSync(path,'utf8');

test('native auth is pinned to the active verified Sessions Music Supabase project',()=>{
  assert.equal(NATIVE_AUTH_BOUNDARY.provider,'supabase-auth');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectName,'Sessions Music');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectRef,'ennfiyxlkvlmtkmibltz');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectUrl,'https://ennfiyxlkvlmtkmibltz.supabase.co');
  assert.equal(NATIVE_AUTH_BOUNDARY.region,'ap-northeast-1');
  assert.equal(NATIVE_AUTH_BOUNDARY.status,'ready');
  assert.equal(NATIVE_AUTH_BOUNDARY.requiresActiveProject,true);
  assert.equal(NATIVE_AUTH_BOUNDARY.requiresPublishableKey,true);
  assert.equal(NATIVE_AUTH_BOUNDARY.forbiddenProject,'svhxjfearcuqxikzvlyb');
  assert.equal(NATIVE_AUTH_BOUNDARY.browserCookieImportAllowed,false);
});

test('native Supabase client still refuses disabled or mismatched backend configuration before creating a client',()=>{
  const source=read('native/sessions-native/src/supabase-client.js');
  assert.match(source,/NATIVE_AUTH_BOUNDARY\.status!==['"]ready['"]/);
  assert.match(source,/!config\?\.enabled/);
  assert.match(source,/ref!==NATIVE_AUTH_BOUNDARY\.projectRef/);
  assert.match(source,/config\.url!==NATIVE_AUTH_BOUNDARY\.projectUrl/);
  assert.match(source,/forbidden development Supabase project/);
  assert.match(source,/verification\.error\.status===401\|\|verification\.error\.status===403/);
  assert.match(source,/verification\.data\.user\.id!==session\.user\?\.id/);
});

test('secure native Supabase storage is writable only after the shared auth boundary is ready',()=>{
  const source=read('native/sessions-native/src/session-store.js');
  assert.match(source,/function requireReadyBoundary/);
  assert.match(source,/NATIVE_AUTH_BOUNDARY\.status!==['"]ready['"]/);
  assert.match(source,/requireReadyBoundary\(\);[\s\S]*provider!==['"]supabase-auth['"]/);
  assert.match(source,/projectRef!==NATIVE_AUTH_BOUNDARY\.projectRef/);
  assert.match(source,/WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
});

test('native package uses the same exact Supabase JS generation as the web runtime',()=>{
  const root=JSON.parse(read('package.json'));
  const native=JSON.parse(read('native/sessions-native/package.json'));
  assert.equal(native.dependencies['@supabase/supabase-js'],root.dependencies['@supabase/supabase-js']);
});
