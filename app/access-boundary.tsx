'use client';
import {useEffect,useState} from 'react';
import {ShieldAlert,ShieldCheck} from 'lucide-react';
import {sessionFetch} from '@/lib/supabase-browser';

type Surface='provider'|'corporate';
type SessionResponse={
 user:null|{displayName:string;email:string|null;phone:string|null;roles:Array<{role:string;label:string}>};
 capabilities?:{customer:boolean;provider:boolean;corporate:boolean};
 permissions?:string[];
 error?:string;
};

export default function AccessBoundary({surface,children}:{surface:Surface;children:React.ReactNode}){
 const[state,setState]=useState<'loading'|'allowed'|'signed-out'|'denied'|'error'>('loading');
 const[session,setSession]=useState<SessionResponse|null>(null);
 useEffect(()=>{let active=true;void sessionFetch('/api/session',{cache:'no-store'}).then(async response=>{
  const value=await response.json() as SessionResponse;if(!active)return;setSession(value);
  if(response.status===401){setState('signed-out');return}
  if(!response.ok){setState('error');return}
  setState(value.capabilities?.[surface]?'allowed':'denied');
 }).catch(()=>active&&setState('error'));return()=>{active=false}},[surface]);
 if(state==='allowed')return <>{children}</>;
 if(state==='loading')return <section className="r-width r-inner"><div className="r-panel"><ShieldCheck size={28}/><h1>Checking account authority…</h1><p>Sessions is verifying this account and its active organization access before opening the workspace.</p></div></section>;
 if(state==='signed-out')return <section className="r-width r-inner"><div className="r-panel"><ShieldAlert size={28}/><h1>Sign in required</h1><p>This workspace contains private operational data. Sign in with the account that has been assigned access.</p><a className="r-primary" href={'/account?return_to='+encodeURIComponent(surface==='corporate'?'/registry-admin':'/manage')}>Go to sign in</a></div></section>;
 if(state==='denied')return <section className="r-width r-inner"><div className="r-panel"><ShieldAlert size={28}/><h1>Access not granted</h1><p>{surface==='corporate'?'Corporate operations require an assigned Sessions office role. Customer or provider accounts cannot open this console.':'Provider tools require an active studio organization membership or provider role.'}</p>{session?.user?.roles?.length?<p className="r-small">Current authority: {session.user.roles.map(value=>value.label).join(', ')}.</p>:null}<a className="r-secondary" href="/account">Your account</a></div></section>;
 return <section className="r-width r-inner"><div className="r-panel"><ShieldAlert size={28}/><h1>Authority check unavailable</h1><p>Sessions could not safely resolve this account’s permissions, so access has been denied. No private workspace data has been shown.</p><button className="r-secondary" onClick={()=>window.location.reload()}>Retry</button></div></section>;
}
