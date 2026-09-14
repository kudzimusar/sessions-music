import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NATIVE_AUTH_BOUNDARY} from '../packages/product-core/index.js';

const read=path=>readFileSync(path,'utf8');

test('native auth is pinned to the verified Sessions Supabase project and remains inactive until the project is ready',()=>{
  assert.equal(NATIVE_AUTH_BOUNDARY.provider,'supabase-auth');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectRef,'meswozsllmmiqjwljvnb');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectUrl,'https://meswozsllmmiqjwljvnb.supabase.co');
  assert.equal(NATIVE_AUTH_BOUNDARY.status,'identified-project-inactive');
  assert.equal(NATIVE_AUTH_BOUNDARY.requiresActiveProject,true);
  assert.equal(NATIVE_AUTH_BOUNDARY.requiresPublishableKey,true);
  assert.equal(NATIVE_AUTH_BOUNDARY.forbiddenProject,'svhxjfearcuqxikzvlyb');
  assert.equal(NATIVE_AUTH_BOUNDARY.browserCookieImportAllowed,false);
});

test('native Supabase client refuses inactive or mismatched auth configuration before creating a client',()=>{
  const source=read('native/sessions-native/src/supabase-client.js');
  assert.match(source,/NATIVE_AUTH_BOUNDARY\.status!==['"]ready['"]/);
  assert.match(source,/ref!==NATIVE_AUTH_BOUNDARY\.projectRef/);
  assert.match(source,/config\.url!==NATIVE_AUTH_BOUNDARY\.projectUrl/);
  assert.match(source,/forbidden development Supabase project/);
  assert.match(source,/verification\.error\.status===401\|\|verification\.error\.status===403/);
  assert.match(source,/verification\.data\.user\.id!==session\.user\?\.id/);
});

test('secure native Supabase storage is writable only after the shared auth boundary becomes ready',()=>{
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
