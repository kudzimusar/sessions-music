'use client';
import {useEffect,useState} from 'react';
import {AudioLines,ShieldCheck} from 'lucide-react';
import {bootstrapServerSession,getSupabaseBrowser,registerBrowserDevice} from '@/lib/supabase-browser';

const safe=(value:string|null)=>value&&value.startsWith('/')&&!value.startsWith('//')?value:'/mobile';
export default function AuthComplete(){
 const[message,setMessage]=useState('Completing secure sign-in…');
 useEffect(()=>{void (async()=>{
  try{
   const client=await getSupabaseBrowser();if(!client)throw new Error('Sessions identity is not configured.');
   const deadline=Date.now()+10_000;let session=(await client.auth.getSession()).data.session;
   while(!session&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,250));session=(await client.auth.getSession()).data.session}
   if(!session)throw new Error('The sign-in session was not established. Please start again.');
   await registerBrowserDevice();await bootstrapServerSession();
   const target=safe(new URLSearchParams(window.location.search).get('return_to'));
   window.location.replace(target);
  }catch(error){setMessage(error instanceof Error?error.message:'Sign-in could not be completed.')}
 })()},[]);
 return <main className="sessions-auth-complete"><div><span className="cv5-brand-mark"><AudioLines size={22}/></span><ShieldCheck size={28}/><h1>Sessions</h1><p>{message}</p><a href="/welcome">Return to sign in</a></div></main>;
}
