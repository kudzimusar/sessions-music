import {AppState,Platform} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {readAuthConfig} from './api';
import {clearNativeSession,nativeSupabaseStorage,persistVerifiedSupabaseSession} from './session-store';

let client=null;
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
  return {url,projectRef,publishableKey:config.publishableKey};
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
  const config=validateSessionsSupabaseConfig(await readAuthConfig());
  client=createClient(config.url,config.publishableKey,{
    auth:{
      storage:nativeSupabaseStorage,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:false,
    },
  });
  const {data}=client.auth.onAuthStateChange((_event,session)=>{void mirrorSession(session,config.projectRef)});
  authSubscription=data.subscription;
  appStateSubscription=AppState.addEventListener('change',state=>{
    if(state==='active')client?.auth.startAutoRefresh();
    else client?.auth.stopAutoRefresh();
  });
  if(AppState.currentState==='active')client.auth.startAutoRefresh();
  const {data:sessionData,error}=await client.auth.getSession();
  if(error)throw error;
  await mirrorSession(sessionData.session,config.projectRef);
  return client;
}

export async function nativeAuthReadiness(){
  if(Platform.OS==='web')return {ready:false,reason:'web-projection',projectRef:NATIVE_AUTH_BOUNDARY.projectRef};
  try{
    const config=validateSessionsSupabaseConfig(await readAuthConfig());
    return {ready:true,projectRef:config.projectRef,url:config.url};
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
  client=null;
}
