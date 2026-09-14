import {AppState,Platform} from 'react-native';
import {createClient} from '@supabase/supabase-js';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {readAuthConfig} from './api';
import {secureSupabaseStorage} from './supabase-storage';
import {clearNativeSession,persistVerifiedSupabaseSession} from './session-store';

let clientPromise=null;
let appStateSubscription=null;
let authSubscription=null;

function projectRefFromUrl(url){
  try{return new URL(url).hostname.split('.')[0]||'';}catch{return '';}
}

export function assertSessionsAuthConfig(config){
  if(!config?.enabled)throw new Error(config?.reason||'Sessions native authentication is not enabled by the backend.');
  if(!config.url||!config.publishableKey)throw new Error('Sessions native authentication configuration is incomplete.');
  const ref=projectRefFromUrl(config.url);
  if(ref!==NATIVE_AUTH_BOUNDARY.projectRef||config.url!==NATIVE_AUTH_BOUNDARY.projectUrl){
    throw new Error('Refusing Supabase configuration that does not match the verified Sessions project.');
  }
  if(ref===NATIVE_AUTH_BOUNDARY.forbiddenProject)throw new Error('The forbidden development Supabase project cannot be used by Sessions native.');
  return config;
}

function attachNativeRefresh(client){
  if(Platform.OS==='web'||appStateSubscription)return;
  if(AppState.currentState==='active')client.auth.startAutoRefresh();
  appStateSubscription=AppState.addEventListener('change',state=>{
    if(state==='active')client.auth.startAutoRefresh();else client.auth.stopAutoRefresh();
  });
}

function attachBearerSynchronization(client){
  if(Platform.OS==='web'||authSubscription)return;
  const listener=client.auth.onAuthStateChange((_event,session)=>{
    queueMicrotask(async()=>{
      try{
        if(!session){await clearNativeSession();return;}
        const verification=await client.auth.getUser(session.access_token);
        if(verification.error||!verification.data.user||verification.data.user.id!==session.user?.id){await clearNativeSession();return;}
        await persistVerifiedSupabaseSession({
          accessToken:session.access_token,
          userId:verification.data.user.id,
          expiresAt:session.expires_at||null,
          provider:'supabase-auth',
          projectRef:NATIVE_AUTH_BOUNDARY.projectRef,
        });
      }catch{await clearNativeSession();}
    });
  });
  authSubscription=listener.data.subscription;
}

export async function getSessionsSupabase(){
  if(!clientPromise){
    clientPromise=(async()=>{
      const config=assertSessionsAuthConfig(await readAuthConfig());
      const client=createClient(config.url,config.publishableKey,{
        auth:{
          storage:secureSupabaseStorage,
          persistSession:Platform.OS!=='web',
          autoRefreshToken:Platform.OS!=='web',
          detectSessionInUrl:false,
        },
      });
      attachNativeRefresh(client);
      attachBearerSynchronization(client);
      return client;
    })().catch(error=>{clientPromise=null;throw error;});
  }
  return clientPromise;
}

export async function readVerifiedNativeSupabaseSession(){
  const client=await getSessionsSupabase();
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  const session=data.session;
  if(!session)return null;
  const verification=await client.auth.getUser(session.access_token);
  if(verification.error||!verification.data.user)throw verification.error||new Error('Sessions Auth could not verify the native session.');
  if(verification.data.user.id!==session.user?.id)throw new Error('Native session identity does not match Sessions Auth.');
  return session;
}

export async function signOutSessionsSupabase(){
  const client=await getSessionsSupabase();
  const {error}=await client.auth.signOut({scope:'local'});
  if(error)throw error;
  await clearNativeSession();
}
