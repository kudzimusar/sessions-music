import * as SecureStore from 'expo-secure-store';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';

const ACCESS_TOKEN_KEY='sessions.native.supabase.access-token';
const SESSION_META_KEY='sessions.native.supabase.session-meta';

export async function readNativeAccessToken(){
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function readNativeSessionMeta(){
  const raw=await SecureStore.getItemAsync(SESSION_META_KEY);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}

export async function persistVerifiedSupabaseSession({accessToken,userId,expiresAt,provider,projectRef}){
  if(provider!=='supabase-auth')throw new Error('Only a verified Supabase Auth session may be persisted.');
  if(projectRef!==NATIVE_AUTH_BOUNDARY.projectRef||projectRef===NATIVE_AUTH_BOUNDARY.forbiddenProject){
    throw new Error('Refusing to persist a session from an unverified Supabase project.');
  }
  if(typeof accessToken!=='string'||accessToken.length<32)throw new Error('Refusing to store an invalid native access token.');
  if(typeof userId!=='string'||!userId)throw new Error('A trusted user id is required.');
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,accessToken,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
  await SecureStore.setItemAsync(SESSION_META_KEY,JSON.stringify({userId,expiresAt,provider,projectRef}),{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});
}

export async function clearNativeSession(){
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_META_KEY),
  ]);
}
