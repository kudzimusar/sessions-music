import {Platform} from 'react-native';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {readAuthConfig} from './api';
import {assertSessionsAuthConfig,getSessionsSupabase,readVerifiedNativeSupabaseSession,signOutSessionsSupabase} from './supabase-client';

async function verifiedRuntimeConfig(){
  return assertSessionsAuthConfig(await readAuthConfig());
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
  if(Platform.OS==='web')throw new Error('Browser UAT projection cannot initialize native authentication.');
  const config=await verifiedRuntimeConfig();
  const identity=normalizedIdentity(channel,value);
  if(channel==='email'&&config.emailEnabled!==true)throw new Error('Email sign-in is not enabled for Sessions.');
  if(channel==='phone'&&config.phoneEnabled!==true)throw new Error('Phone sign-in is not enabled for Sessions.');
  const client=await getSessionsSupabase();
  const options={shouldCreateUser:true,...(captchaToken?{captchaToken}:{})};
  const result=channel==='email'
    ?await client.auth.signInWithOtp({email:identity,options})
    :await client.auth.signInWithOtp({phone:identity,options});
  if(result.error)throw result.error;
  return {channel,identity};
}

export async function verifyNativeOtp({channel,value,token}){
  if(Platform.OS==='web')throw new Error('Browser UAT projection cannot initialize native authentication.');
  const identity=normalizedIdentity(channel,value);
  const otp=String(token||'').trim();
  if(!/^\d{6}$/.test(otp))throw new Error('Enter the 6-digit verification code.');
  const client=await getSessionsSupabase();
  const result=channel==='email'
    ?await client.auth.verifyOtp({email:identity,token:otp,type:'email'})
    :await client.auth.verifyOtp({phone:identity,token:otp,type:'sms'});
  if(result.error)throw result.error;
  if(!result.data.session)throw new Error('Supabase verified the code but did not return a native session.');
  const verified=await readVerifiedNativeSupabaseSession();
  if(!verified||verified.user?.id!==result.data.session.user?.id)throw new Error('Sessions could not verify the native Supabase session.');
  return verified;
}

export async function nativeAuthReadiness(){
  if(Platform.OS==='web')return {ready:false,reason:'web-projection',projectRef:NATIVE_AUTH_BOUNDARY.projectRef};
  try{
    const config=await verifiedRuntimeConfig();
    return {
      ready:true,
      projectRef:NATIVE_AUTH_BOUNDARY.projectRef,
      url:NATIVE_AUTH_BOUNDARY.projectUrl,
      emailEnabled:config.emailEnabled===true,
      phoneEnabled:config.phoneEnabled===true,
      googleEnabled:config.googleEnabled===true,
      appleEnabled:config.appleEnabled===true,
    };
  }catch(error){
    return {ready:false,projectRef:NATIVE_AUTH_BOUNDARY.projectRef,reason:error instanceof Error?error.message:'Native auth unavailable'};
  }
}

export async function signOutSessionsNative(){
  return signOutSessionsSupabase();
}
