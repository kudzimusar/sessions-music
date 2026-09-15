import {AI_DISCOVERY_CONTRACT,AI_DISCOVERY_EQUIPMENT,SESSIONS_RELEASE,releaseMatchesPhase5} from '@sessions/product-core';
import {readNativeAccessToken} from './session-store';

export const DEFAULT_UAT_ORIGIN='https://sessions-music.kudzimusar.chatgpt.site';
export const UAT_ORIGIN=process.env.EXPO_PUBLIC_SESSIONS_API_BASE_URL||DEFAULT_UAT_ORIGIN;

async function readJson(response){
  const text=await response.text();
  try{return text?JSON.parse(text):null}catch{return {raw:text}}
}

export class SessionsApiError extends Error{
  constructor(message,status,body){super(message);this.name='SessionsApiError';this.status=status;this.body=body}
}

export async function sessionsFetch(path,{auth=false,...options}={}){
  const headers={Accept:'application/json',...(options.headers||{})};
  if(auth){
    const accessToken=await readNativeAccessToken();
    if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
  }
  // Deliberately omit credentials/cookies. ChatGPT Sites browser audience cookies are never native auth.
  const response=await fetch(`${UAT_ORIGIN}${path}`,{...options,headers});
  const body=await readJson(response);
  if(!response.ok){
    const message=body?.error||`Sessions API returned HTTP ${response.status}`;
    throw new SessionsApiError(message,response.status,body);
  }
  return {response,body};
}

export async function verifyRelease(){
  const {body}=await sessionsFetch('/api/release');
  return {release:body,matches:releaseMatchesPhase5(body),expected:SESSIONS_RELEASE};
}

export async function readAuthConfig(){
  const {body}=await sessionsFetch('/api/auth/config');
  return body;
}

export async function readNativeSession(){
  const {body}=await sessionsFetch('/api/auth/session',{auth:true});
  return body;
}

export async function readNativeOnboarding(){
  const {body}=await sessionsFetch('/api/onboarding',{auth:true});
  return body;
}

export async function updateNativeOnboarding(action){
  const {body}=await sessionsFetch('/api/onboarding',{
    auth:true,
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(action),
  });
  return body;
}

export async function readPlannerCapabilities(){
  const {body}=await sessionsFetch(AI_DISCOVERY_CONTRACT.endpoint);
  const supported=new Set(AI_DISCOVERY_EQUIPMENT);
  return {
    aiReady:body?.aiReady===true,
    timezone:body?.timezone||'Africa/Harare',
    currency:body?.currency||'USD',
    equipment:Array.isArray(body?.equipment)?body.equipment.filter(item=>supported.has(item)):AI_DISCOVERY_EQUIPMENT,
  };
}

export async function planSession({mode,prompt,consent,input,studioId}){
  if(mode==='ai'&&AI_DISCOVERY_CONTRACT.requiresExplicitConsent&&consent!==true)throw new Error('Explicit consent is required before an AI brief can be sent.');
  if(mode==='ai'&&(!prompt||!prompt.trim()))throw new Error('Describe the session you need before using AI interpretation.');
  const {body}=await sessionsFetch(AI_DISCOVERY_CONTRACT.endpoint,{
    auth:true,
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode,prompt,consent,input,...(studioId?{studioId}:{})}),
  });
  return body;
}

export async function readStudioInventory({studioId,date,duration,size}){
  return planSession({
    mode:'guided',
    studioId,
    input:{date,start:null,duration,size,budget:null,area:'',service:'',equipment:[],flexDays:0},
  });
}

function nativeRequestKey(){
  const hex=()=>Math.floor(Math.random()*16).toString(16);
  let value='';for(let index=0;index<32;index++)value+=hex();
  return `${value.slice(0,8)}-${value.slice(8,12)}-4${value.slice(13,16)}-${['8','9','a','b'][Math.floor(Math.random()*4)]}${value.slice(17,20)}-${value.slice(20,32)}`;
}

export async function submitNativeBooking({studioId,roomId,date,start,duration,size,name,phone,note='',addOns=[],useLoyaltyCredit=false,terms=true,key=nativeRequestKey()}){
  const {body}=await sessionsFetch('/api/registry',{
    auth:true,
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'book',studioId,key,roomId,date,start,duration,size,name,phone,note,addOns,useLoyaltyCredit,terms}),
  });
  return body;
}

/**
 * Security probe only. A 401/403 is success; 200 is a failed security check.
 * Never attach browser audience cookies, secure-store bearer tokens or synthetic credentials here.
 */
export async function probeProtectedEndpoint(){
  const endpoint='/api/corporate/overview';
  const response=await fetch(`${UAT_ORIGIN}${endpoint}`,{method:'GET',headers:{Accept:'application/json'}});
  const body=await readJson(response);
  return {endpoint,status:response.status,protected:response.status===401||response.status===403,body};
}
