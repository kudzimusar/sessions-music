import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {NATIVE_AUTH_BOUNDARY} from '../packages/product-core/index.js';

const read=path=>readFileSync(path,'utf8');

test('native auth is pinned to the verified Sessions Supabase project and forbidden project stays blocked',()=>{
  assert.equal(NATIVE_AUTH_BOUNDARY.provider,'supabase-auth');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectRef,'meswozsllmmiqjwljvnb');
  assert.equal(NATIVE_AUTH_BOUNDARY.projectUrl,'https://meswozsllmmiqjwljvnb.supabase.co');
  assert.equal(NATIVE_AUTH_BOUNDARY.forbiddenProject,'svhxjfearcuqxikzvlyb');
  assert.equal(NATIVE_AUTH_BOUNDARY.browserCookieImportAllowed,false);
});

test('native Supabase bootstrap rejects mismatched projects and uses secure persistent storage',()=>{
  const auth=read('native/sessions-native/src/supabase-auth.js');
  const store=read('native/sessions-native/src/session-store.js');
  assert.match(auth,/url!==expected\|\|projectRef!==NATIVE_AUTH_BOUNDARY\.projectRef/);
  assert.match(auth,/projectRef===NATIVE_AUTH_BOUNDARY\.forbiddenProject/);
  assert.match(auth,/storage:nativeSupabaseStorage/);
  assert.match(auth,/detectSessionInUrl:false/);
  assert.match(auth,/startAutoRefresh/);
  assert.match(store,/expo-secure-store/);
  assert.match(store,/WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
});

test('native OTP flow uses real Supabase sessions, safe continuation and channel gating',()=>{
  const auth=read('native/sessions-native/src/supabase-auth.js');
  const screen=read('native/sessions-native/app/sign-in.js');
  const continuation=read('native/sessions-native/src/continuation.js');
  assert.match(auth,/signInWithOtp/);
  assert.match(auth,/verifyOtp/);
  assert.match(auth,/Email sign-in is not enabled for Sessions/);
  assert.match(auth,/Phone sign-in is not enabled for Sessions/);
  assert.match(auth,/did not return a native session/);
  assert.match(screen,/6-digit verification code/);
  assert.match(screen,/sanitizeNativeContinuation/);
  assert.match(screen,/Sign in without leaving the app/);
  assert.match(continuation,/'onboarding'/);
  assert.match(continuation,/value\.startsWith\('\/\/'\)/);
  assert.match(continuation,/value\.includes\('\:\/\/'\)/);
});

test('native onboarding writes canonical profile consent and provider intention only after native identity',()=>{
  const onboarding=read('native/sessions-native/app/onboarding.js');
  const api=read('native/sessions-native/src/api.js');
  assert.match(api,/sessionsFetch\('\/api\/onboarding',\{auth:true\}\)/);
  assert.match(api,/body:JSON\.stringify\(action\)/);
  assert.match(onboarding,/updateNativeOnboarding\(\{action:'completeProfile'/);
  assert.match(onboarding,/consentType:'terms'/);
  assert.match(onboarding,/consentType:'privacy'/);
  assert.match(onboarding,/journey:'provider'/);
  assert.match(onboarding,/Platform\.OS==='android'\?'android':Platform\.OS==='ios'\?'ios':'web'/);
  assert.doesNotMatch(onboarding,/journey:'corporate'/);
});

test('Chromium projection cannot persist native Supabase authentication material',()=>{
  const web=read('native/sessions-native/src/session-store.web.js');
  assert.match(web,/cannot persist native authentication material/);
  assert.match(web,/async getItem\(\)\{return null\}/);
});

test('native discovery renders only canonical Sessions media and keeps a neutral fallback',()=>{
  const cards=read('native/sessions-native/src/product-components.js');
  assert.match(cards,/\/api\\\/media\\\//);
  assert.match(cards,/url\.origin===origin\.origin/);
  assert.match(cards,/room photo/);
  assert.match(cards,/branded image fallback/);
  assert.doesNotMatch(cards,/unsplash|pexels|pixabay|images\.google/i);
});

test('native UAT copy reflects identified-but-inactive Sessions identity authority',()=>{
  const uat=read('native/sessions-native/src/uat-data.js');
  assert.match(uat,/Verified Sessions Supabase project identified/);
  assert.match(uat,/currently inactive/);
  assert.doesNotMatch(uat,/positively identified\.$/m);
});

test('installed iOS and Android acceptance requires Maestro flows over the real UAT app',()=>{
  const smoke=read('native/sessions-native/.maestro/phase1-5-smoke.yml');
  const diagnostics=read('native/sessions-native/.maestro/native-diagnostics.yml');
  const operations=read('native/sessions-native/.maestro/phase5-operations.yml');
  for(const flow of [smoke,diagnostics,operations])assert.match(flow,/appId: com\.sessionstech\.sessions\.uat/);
  assert.match(smoke,/Sign in without leaving the app/);
  assert.match(smoke,/SESSIONS AI · INTENT, NOT INVENTION/);
  assert.match(diagnostics,/Verify \/api\/release/);
  assert.match(diagnostics,/Run anonymous probe/);
  assert.match(diagnostics,/401.*403/);
  assert.match(operations,/Choose a session/);
  assert.match(operations,/Continue securely/);
  assert.match(operations,/Today at OneVibe Studiox/);
});
