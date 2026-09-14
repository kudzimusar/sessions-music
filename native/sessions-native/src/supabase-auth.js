import {AppState,Platform} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {readAuthConfig} from './api';
import {clearNativeSession,nativeSupabaseStorage,persistVerifiedSupabaseSession} from './session-store';

let client=null;
let runtimeConfig=null;
let authSubscription=null;
let appStateSubscription=null;

function normalizedUrl(value){return typeof value==='string'?value.replace(/\/+$/,''):''}
function projectRefFromUrl(value){
  try{
    const host=new URL(value).hostname;
    return host.endsWith('.supabase.co')?host.slice(0,-'.supabase.co'.length):'';
  }catch{return ''}
}

export function validateSessionsSupabaseConfig(config){
  if(!config?.enabled)throw new Error('Sessions Supabase Auth is not enabled by the deployed runtime.');
  const url=normalizedUrl(config.url);
  const expected=normalizedUrl(NATIVE_AUTH_BOUNDARY.projectUrl);
  const projectRef=projectRefFromUrl(url);
  if(url!==expected||projectRef!==NATIVE_AUTH_BOUNDARY.projectRef||projectRef===NATIVE_AUTH_BOUNDARY.forbiddenProject){
    throw new Error('Refusing Supabase configuration that does not match the verified Sessions project.');
  }
  if(typeof config.publishableKey!=='string'||config.publishableKey.length<20){
    throw new Error('Sessions Supabase publishable key is unavailable.');
  }
  return {
    url,
    projectRef,
    publishableKey:config.publishableKey,
    emailEnabled:config.emailEnabled===true,
    phoneEnabled:config.phoneEnabled===true,
    googleEnabled:config.googleEnabled===true,
    appleEnabled:config.appleEnabled===true,
    captchaProvider:config.captchaProvider||null,
    captchaSiteKey:config.captchaSiteKey||null,
  };
}

async function mirrorSession(session,projectRef){
  if(!session?.access_token||!session?.user?.id){await clearNativeSession();return}
  await persistVerifiedSupabaseSession({
    accessToken:session.access_token,
    userId:session.user.id,
    expiresAt:session.expires_at||null,
    provider:'supabase-auth',
    projectRef,
  });
}

export async function initializeSessionsSupabase(){
  if(Platform.OS==='web')throw new Error('Browser UAT projection cannot initialize native authentication.');
  if(client)return client;
  runtimeConfig=validateSessionsSupabaseConfig(await readAuthConfig());
  client=createClient(runtimeConfig.url,runtimeConfig.publishableKey,{
    auth:{
      storage:nativeSupabaseStorage,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:false,
    },
  });
  const {data}=client.auth.onAuthStateChange((_event,session)=>{void mirrorSession(session,runtimeConfig.projectRef)});
  authSubscription=data.subscription;
  appStateSubscription=AppState.addEventListener('change',state=>{
    if(state==='active')client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  });
  if(AppState.currentState==='active')client.auth.startAutoRefresh();
  const {data:sessionData,error}=await client.auth.getSession();
  if(error)throw error;
  await mirrorSession(sessionData.session,runtimeConfig.projectRef);
  return client;
}

function normalizedIdentity(channel,value){
  const input=String(value||'').trim();
  if(channel==='email'){
    const email=input.toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
    return email;
  }
  if(channel==='phone'){
    const phone=input.replace(/[\s()-]/g,'');
    if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Enter a phone number in international format, for example +263…');
    return phone;
  }
  throw new Error('Unsupported Sessions sign-in channel.');
}

export async function requestNativeOtp({channel,value,captchaToken}){
  const auth=await initializeSessionsSupabase();
  const identity=normalizedIdentity(channel,value);
  if(channel==='email'&&!runtimeConfig.emailEnabled)throw new Error('Email sign-in is not enabled for Sessions.');
  if(channel==='phone'&&!runtimeConfig.phoneEnabled)throw new Error('Phone sign-in is not enabled for Sessions.');
  const options={shouldCreateUser:true,...(captchaToken?{captchaToken}:{})};
  const result=channel==='email'?await auth.auth.signInWithOtp({email:identity,options}):await auth.auth.signInWithOtp({phone:identity,options});
  if(result.error)throw result.error;
  return {channel,identity};
}

export async function verifyNativeOtp({channel,value,token}){
  const auth=await initializeSessionsSupabase();
  const identity=normalizedIdentity(channel,value);
  const otp=String(token||'').trim();
  if(!/^\d{6}$/.test(otp))throw new Error('Enter the 6-digit verification code.');
  const result=channel==='email'?await auth.auth.verifyOtp({email:identity,token:otp,type:'email'}):await auth.auth.verifyOtp({phone:identity,token:otp,type:'sms'});
  if(result.error)throw result.error;
  if(!result.data.session)throw new Error('Supabase verified the code but did not return a native session.');
  await mirrorSession(result.data.session,runtimeConfig.projectRef);
  return result.data.session;
}

export async function nativeAuthReadiness(){
  if(Platform.OS==='web')return {ready:false,reason:'web-projection',projectRef:NATIVE_AUTH_BOUNDARY.projectRef};
  try{
    const config=validateSessionsSupabaseConfig(await readAuthConfig());
    return {ready:true,projectRef:config.projectRef,url:config.url,emailEnabled:config.emailEnabled,phoneEnabled:config.phoneEnabled,googleEnabled:config.googleEnabled,appleEnabled:config.appleEnabled};
  }catch(error){
    return {ready:false,projectRef:NATIVE_AUTH_BOUNDARY.projectRef,reason:error instanceof Error?error.message:'Native auth unavailable'};
  }
}

export async function signOutSessionsNative(){
  if(client)await client.auth.signOut({scope:'local'});
  await clearNativeSession();
}

export function disposeSessionsSupabase(){
  authSubscription?.unsubscribe();
  appStateSubscription?.remove();
  authSubscription=null;
  appStateSubscription=null;
  runtimeConfig=null;
  client=null;
}
