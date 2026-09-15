import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {DESIGN_TOKENS,NATIVE_AUTH_BOUNDARY} from '@sessions/product-core';
import {Body,Card,Eyebrow,Field,LinkButton,Notice,PrimaryButton,Screen,SecondaryButton,Small,Title} from '../src/native-ui';
import {sanitizeNativeContinuation} from '../src/continuation';
import {nativeAuthReadiness,requestNativeOtp,verifyNativeOtp} from '../src/supabase-auth';

const c=DESIGN_TOKENS.color;
export default function NativeSignInScreen(){
  const router=useRouter();
  const params=useLocalSearchParams();
  const continuation=useMemo(()=>sanitizeNativeContinuation(typeof params.continue==='string'?params.continue:'/home'),[params.continue]);
  const[readiness,setReadiness]=useState({ready:false,reason:'Checking verified Sessions identity authority…'});
  const[channel,setChannel]=useState('email');
  const[value,setValue]=useState('');
  const[token,setToken]=useState('');
  const[requested,setRequested]=useState(false);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  useEffect(()=>{nativeAuthReadiness().then(setReadiness)},[]);
  const channelReady=readiness.ready&&(channel==='email'?readiness.emailEnabled:readiness.phoneEnabled);
  const request=async()=>{setBusy(true);setError('');try{await requestNativeOtp({channel,value});setRequested(true)}catch(e){setError(e instanceof Error?e.message:'Unable to request a verification code.')}finally{setBusy(false)}};
  const verify=async()=>{setBusy(true);setError('');try{await verifyNativeOtp({channel,value,token});router.replace(continuation)}catch(e){setError(e instanceof Error?e.message:'Unable to verify this code.')}finally{setBusy(false)}};
  return <Screen><LinkButton onPress={()=>router.back()}>Back to gateway</LinkButton><Eyebrow>SESSIONS · NATIVE IDENTITY</Eyebrow><Title>{requested?'Enter your verification code.':'Sign in without leaving the app.'}</Title><Body style={{marginTop:8}}>Sessions uses the verified Supabase identity authority directly. Browser audience cookies and unrelated Supabase projects are never accepted as native identity.</Body>
    <Card style={{marginTop:22}}><Small>Verified project</Small><Text style={styles.project}>{NATIVE_AUTH_BOUNDARY.projectRef}</Text><Small>{readiness.ready?'Native auth runtime is configured.':readiness.reason}</Small></Card>
    {!requested?<><View accessibilityRole="radiogroup" style={styles.channels}>{[['email','Email'],['phone','Phone']].map(([key,label])=><Pressable key={key} accessibilityRole="radio" accessibilityState={{checked:channel===key}} onPress={()=>{setChannel(key);setValue('');setError('')}} style={[styles.channel,channel===key&&styles.channelActive]}><Text style={styles.channelText}>{label}</Text><Text style={styles.radio}>{channel===key?'●':'○'}</Text></Pressable>)}</View><Field label={channel==='email'?'Email address':'Phone number'} value={value} onChangeText={setValue} autoCapitalize="none" autoCorrect={false} keyboardType={channel==='email'?'email-address':'phone-pad'} textContentType={channel==='email'?'emailAddress':'telephoneNumber'} placeholder={channel==='email'?'you@example.com':'+263…'} returnKeyType="send" onSubmitEditing={()=>{if(channelReady&&value.trim()&&!busy)void request()}} hint={channel==='phone'?'Use international format, for example +263…':'Sessions sends a one-time verification code when this channel is enabled.'}/><View style={{marginTop:18}}><PrimaryButton disabled={!channelReady||!value.trim()||busy} onPress={()=>void request()}>{busy?'Requesting…':'Send verification code'}</PrimaryButton></View>{readiness.ready&&!channelReady?<Notice>This sign-in channel is disabled by the verified Sessions runtime configuration.</Notice>:null}</>:<><Field label="6-digit verification code" value={token} onChangeText={text=>setToken(text.replace(/\D/g,'').slice(0,6))} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={6} placeholder="000000" returnKeyType="done" onSubmitEditing={()=>{if(token.length===6&&!busy)void verify()}}/><Small style={{marginTop:8}}>Sent to {value.trim()}. The code proves the Supabase identity; workspace roles are still derived server-side.</Small><View style={styles.actions}><View style={{flex:1}}><SecondaryButton disabled={busy} onPress={()=>{setRequested(false);setToken('');setError('')}}>Change identity</SecondaryButton></View><View style={{flex:1}}><PrimaryButton disabled={token.length!==6||busy} onPress={()=>void verify()}>{busy?'Verifying…':'Verify & continue'}</PrimaryButton></View></View></>}
    {error?<Notice tone="danger">{error}</Notice>:null}
    {!readiness.ready?<Notice>Native authentication remains fail-closed until the verified Sessions Supabase project is active and `/api/auth/config` exposes its real publishable configuration.</Notice>:null}
  </Screen>;
}

const styles=StyleSheet.create({project:{fontSize:15,fontWeight:'850',color:c.ink,marginTop:4,marginBottom:4},channels:{flexDirection:'row',gap:10,marginTop:18},channel:{flex:1,minHeight:52,borderWidth:1,borderColor:c.line,borderRadius:16,backgroundColor:c.white,paddingHorizontal:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},channelActive:{borderWidth:2,borderColor:c.royal,backgroundColor:'#F7F8FF'},channelText:{fontSize:14,fontWeight:'850',color:c.ink},radio:{fontSize:19,color:c.royal},actions:{flexDirection:'row',gap:9,marginTop:18}});
