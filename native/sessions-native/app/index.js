import React,{useEffect,useState} from 'react';
import {Alert,Platform,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {Body,Card,Eyebrow,LinkButton,Notice,PrimaryButton,Screen,SecondaryButton,Small,Title} from '../src/native-ui';
import {readAuthConfig} from '../src/api';
import {sanitizeNativeContinuation} from '../src/continuation';
import {useOnlineState} from '../src/network';

export default function GatewayScreen(){
  const router=useRouter();const params=useLocalSearchParams();const{online}=useOnlineState();const[config,setConfig]=useState(null);
  const continuation=sanitizeNativeContinuation(typeof params.continue==='string'?params.continue:'/home');
  useEffect(()=>{
    // The Chromium web projection is a deterministic UI/UAT surface only. It must not
    // probe the hosted auth service cross-origin or accidentally grow browser-auth behavior.
    if(Platform.OS==='web')return;
    let active=true;readAuthConfig().then(value=>{if(active)setConfig(value)}).catch(()=>{if(active)setConfig(null)});return()=>{active=false};
  },[]);
  const explainBlocked=()=>Alert.alert('Production native sign-in is not certified yet','This UAT app will not reuse ChatGPT Sites cookies or another Supabase project. The sign-in UI and secure session boundary are ready; activation waits for the genuine Sessions Supabase environment.');
  return <Screen offline={!online} contentStyle={{paddingTop:28}}><Eyebrow>SESSIONS · NATIVE GATEWAY</Eyebrow><Title>One identity. Your music spaces.</Title><Body style={{marginTop:10}}>Sign in to discover, book and manage Sessions. Customer is the default context; provider access is earned through a verified studio relationship.</Body>
    <View style={{marginTop:26,gap:10}}><PrimaryButton onPress={explainBlocked}>Continue with phone or email</PrimaryButton><SecondaryButton onPress={explainBlocked}>Continue with Google / Apple</SecondaryButton></View>
    <View style={{marginTop:18}}><Notice>Corporate is never a public account type. Sessions company access appears only after a trusted identity-bound staff invitation or existing authorization.</Notice></View>
    <Card style={{marginTop:24}}><Eyebrow>NATIVE UAT REVIEW</Eyebrow><Body style={{marginTop:6}}>This build contains a clearly isolated fixture projection so the iOS/Android interaction model can be reviewed before production identity is connected. Fixture actions never create production authority or authenticated mutations.</Body><View style={{marginTop:14}}><PrimaryButton onPress={()=>router.replace(continuation)}>Open UAT app preview</PrimaryButton></View></Card>
    <Card><Eyebrow>AUTH BOUNDARY</Eyebrow><Small style={{marginTop:6}}>Authority: {NATIVE_AUTH_BOUNDARY.provider}</Small><Small>Status: {NATIVE_AUTH_BOUNDARY.status}</Small><Small>Server auth config: {Platform.OS==='web'?'not queried in browser UAT':config?'reachable':'not certified / unavailable'}</Small></Card>
    <View style={{marginTop:8}}><LinkButton onPress={()=>router.push('/onboarding')}>Review onboarding architecture</LinkButton><LinkButton onPress={()=>router.push('/security')}>Review recovery & device sessions</LinkButton><LinkButton onPress={()=>router.push('/diagnostics')}>Open native diagnostics</LinkButton></View>
  </Screen>;
}
