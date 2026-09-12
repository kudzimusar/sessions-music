'use client';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';

export type PublicAuthConfig={
  mode:'chatgpt'|'supabase';
  enabled:boolean;
  url?:string;
  publishableKey?:string;
  phoneEnabled:boolean;
  emailEnabled:boolean;
  googleEnabled:boolean;
  appleEnabled:boolean;
  captchaProvider:'turnstile'|null;
  captchaSiteKey?:string;
};

let configPromise:Promise<PublicAuthConfig>|null=null;
let clientPromise:Promise<SupabaseClient|null>|null=null;

export function getAuthConfig(){
  if(!configPromise)configPromise=fetch('/api/auth/config',{cache:'no-store'}).then(async response=>{
    const value=await response.json() as PublicAuthConfig;
    if(!response.ok)throw new Error('Identity configuration is unavailable.');
    return value;
  });
  return configPromise;
}

export function getSupabaseBrowser(){
  if(!clientPromise)clientPromise=getAuthConfig().then(config=>{
    if(config.mode!=='supabase'||!config.enabled||!config.url||!config.publishableKey)return null;
    return createClient(config.url,config.publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  });
  return clientPromise;
}

export async function bootstrapServerSession(){
  const client=await getSupabaseBrowser();if(!client)return false;
  const session=(await client.auth.getSession()).data.session;if(!session?.access_token)return false;
  const response=await fetch('/api/auth/session',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
  if(!response.ok)throw new Error('Sessions could not establish the secure application session.');
  return true;
}

export async function clearServerSession(){
  await fetch('/api/auth/session',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'}).catch(()=>undefined);
}

export async function sessionFetch(input:RequestInfo|URL,init:RequestInit={}){
  const client=await getSupabaseBrowser();
  const session=client?(await client.auth.getSession()).data.session:null;
  const headers=new Headers(init.headers);
  if(session?.access_token)headers.set('Authorization',`Bearer ${session.access_token}`);
  return fetch(input,{...init,headers});
}

export async function registerBrowserDevice(){
  const client=await getSupabaseBrowser();if(!client)return;
  const mobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const deviceName=mobile?'Mobile browser':'Desktop browser';
  const {error}=await client.rpc('register_current_device',{device_name:deviceName,platform:'web'});
  if(error)throw error;
  await bootstrapServerSession();
}
