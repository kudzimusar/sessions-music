'use client';

import {useCallback,useEffect,useState} from 'react';
import {CheckCircle2,ChevronRight,ShieldCheck,UserRound} from 'lucide-react';
import {AuthSignIn,AccountSecurity} from './production-auth';
import {sessionFetch} from '@/lib/supabase-browser';
import type {RegistryState} from '@/lib/registry';

const emptyState:RegistryState={
  studios:[],staff:[],claims:[],bookings:[],issues:[],managedIds:[],ownerIds:[],
  invitations:[],myStaff:[],operator:false,user:null,
};

export default function AccountSurface(){
  const[data,setData]=useState<RegistryState>(emptyState);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  const refresh=useCallback(async()=>{
    try{
      const response=await sessionFetch('/api/registry',{cache:'no-store'});
      const body=await response.json() as RegistryState&{error?:string};
      if(!response.ok)throw new Error(body.error||'Could not load your Sessions account');
      setData(body);setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not load your Sessions account')}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{
    void refresh();
    const changed=()=>void refresh();
    window.addEventListener('sessions-auth-changed',changed);
    return()=>window.removeEventListener('sessions-auth-changed',changed);
  },[refresh]);

  return <div className="as-page" data-sessions-surface="account-security" data-account-contract="unified-profile-v1">
    <header className="as-topbar">
      <a className="as-brand" href="/mobile" aria-label="Sessions home"><img src="/favicon.svg" alt=""/><strong>SESSIONS</strong><i>.</i></a>
      <nav aria-label="Account navigation"><a href="/mobile/profile">Profile</a></nav>
    </header>
    {error?<div className="as-alert" role="alert"><span>{error}</span><button onClick={()=>void refresh()}>Retry</button></div>:null}
    {loading?<main className="as-shell"><div className="as-loading">Loading your Sessions identity…</div></main>:<AccountContent data={data}/>} 
  </div>;
}

function AccountContent({data}:{data:RegistryState}){
  if(!data.user)return <main className="as-shell as-signin"><section><span>ONE IDENTITY · EVERY CLIENT</span><h1>Account & security.</h1><p>Sign in to manage the same Sessions identity used by iOS, Android, PWA and desktop.</p></section><div className="as-card"><AuthSignIn returnTo="/account"/></div></main>;

  const user=data.user;
  return <main className="as-shell">
    <section className="as-identity">
      <div className="as-avatar"><UserRound size={30}/></div>
      <div><span>YOUR SESSIONS IDENTITY</span><h1>{user.displayName}</h1><p>{user.email||user.phone||'Verified Sessions identity'}</p></div>
      <CheckCircle2 size={22}/>
    </section>

    <div className="as-grid">
      <section className="as-card as-security">
        <div className="as-heading"><span className="as-icon"><ShieldCheck size={22}/></span><div><small>ACCESS & PRIVACY</small><h2>Account & security</h2><p>Contacts, MFA, device sessions and sign-in state belong to this one identity.</p></div></div>
        {user.method!=='chatgpt_demo'?<AccountSecurity userId={user.id} contact={user.phone||user.email||user.id}/>:<div className="as-preview"><strong>Private preview identity</strong><p>The ChatGPT Sites audience session is separate from Sessions production authentication.</p><a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out<ChevronRight size={17}/></a></div>}
      </section>

      <aside className="as-side">
        <section className="as-card"><small>PROFILE</small><h2>One account, authorized contexts.</h2><p>Your personal, provider and company access stays attached to the same identity. Roles never create a second account.</p><a href="/mobile/profile">Open Profile<ChevronRight size={17}/></a></section>
        <section className="as-principle"><strong>Same resources, different composition.</strong><p>Native mobile and desktop/PWA may change navigation and density. Identity, authorization, bookings, studio records, media, pricing and security state do not.</p></section>
      </aside>
    </div>
  </main>;
}
