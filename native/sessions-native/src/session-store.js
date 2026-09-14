import * as SecureStore from 'expo-secure-store';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';

const ACCESS_TOKEN_KEY='sessions.native.supabase.access-token';
const SESSION_META_KEY='sessions.native.supabase.session-meta';
const AUTH_STORAGE_PREFIX='sessions.native.supabase.storage.';
const secureOptions={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};

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
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY,accessToken,secureOptions);
  await SecureStore.setItemAsync(SESSION_META_KEY,JSON.stringify({userId,expiresAt,provider,projectRef}),secureOptions);
}

export const nativeSupabaseStorage={
  async getItem(key){return SecureStore.getItemAsync(`${AUTH_STORAGE_PREFIX}${key}`)},
  async setItem(key,value){
    if(NATIVE_AUTH_BOUNDARY.status!=='identified-project-inactive'&&NATIVE_AUTH_BOUNDARY.status!=='ready')throw new Error('Native authentication boundary is not trusted.');
    return SecureStore.setItemAsync(`${AUTH_STORAGE_PREFIX}${key}`,value,secureOptions);
  },
  async removeItem(key){return SecureStore.deleteItemAsync(`${AUTH_STORAGE_PREFIX}${key}`)},
};

export async function clearNativeSession(){
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_META_KEY),
  ]);
}
