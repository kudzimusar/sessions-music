import {SESSIONS_RELEASE,releaseMatchesPhase5} from '@sessions/product-core';

export const DEFAULT_UAT_ORIGIN='https://sessions-music.kudzimusar.chatgpt.site';
export const UAT_ORIGIN=process.env.EXPO_PUBLIC_SESSIONS_API_BASE_URL||DEFAULT_UAT_ORIGIN;

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):null}catch{return {raw:text}}
}

export async function verifyRelease(){
  const response=await fetch(`${UAT_ORIGIN}/api/release`,{method:'GET',headers:{Accept:'application/json'}});
  const body=await readJson(response);
  if(!response.ok)throw new Error(`Release endpoint returned HTTP ${response.status}`);
  return {release:body,matches:releaseMatchesPhase5(body),expected:SESSIONS_RELEASE};
}

/**
 * Security probe only. A 401/403 is success; 200 is a failed security check.
 * Never attach browser audience cookies or synthetic credentials here.
 */
export async function probeProtectedEndpoint(){
  const endpoint='/api/corporate/overview';
  const response=await fetch(`${UAT_ORIGIN}${endpoint}`,{method:'GET',headers:{Accept:'application/json'}});
  const body=await readJson(response);
  return {endpoint,status:response.status,protected:response.status===401||response.status===403,body};
}
