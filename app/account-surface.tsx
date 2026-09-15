'use client';

import {useCallback,useEffect,useState} from 'react';
import {AudioLines,Building2,CalendarDays,CheckCircle2,ChevronRight,ShieldCheck,UserRound,Users} from 'lucide-react';
import {AuthSignIn,AccountSecurity} from './production-auth';
import {sessionFetch} from '@/lib/supabase-browser';
import type {RegistryState} from '@/lib/registry';
import type {OnboardingSnapshot} from '@/lib/onboarding-server';

const emptyState:RegistryState={
  studios:[],staff:[],claims:[],bookings:[],issues:[],managedIds:[],ownerIds:[],
  invitations:[],myStaff:[],operator:false,user:null,
};

export default function AccountSurface(){
  const[data,setData]=useState<RegistryState>(emptyState);
  const[snapshot,setSnapshot]=useState<OnboardingSnapshot|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');

  const refresh=useCallback(async()=>{
    try{
      const [registryResponse,onboardingResponse]=await Promise.all([
        sessionFetch('/api/registry',{cache:'no-store'}),
        sessionFetch('/api/onboarding',{cache:'no-store'}),
      ]);
      const registry=await registryResponse.json() as RegistryState&{error?:string};
      if(!registryResponse.ok)throw new Error(registry.error||'Could not load your Sessions account');
      setData(registry);
      if(onboardingResponse.ok)setSnapshot(await onboardingResponse.json() as OnboardingSnapshot);
      setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not load your Sessions account')}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('sessions-auth-changed',changed);return()=>window.removeEventListener('sessions-auth-changed',changed)},[refresh]);

  return <div className="as-page" data-sessions-surface="account-desktop" data-account-contract="unified-profile-v2">
    <header className="as-topbar"><a className="as-brand" href="/" aria-label="Sessions home"><span><AudioLines size={20}/></span><strong>SESSIONS</strong><i>.</i></a><nav aria-label="Account navigation"><a href="/">Explore</a><a href="/requests">My sessions</a><a href="/manage">Studio</a><a href="/mobile/profile">Mobile profile</a></nav></header>
    {error?<div className="as-alert" role="alert"><span>{error}</span><button onClick={()=>void refresh()}>Retry</button></div>:null}
    {loading?<main className="as-shell"><div className="as-loading">Loading your Sessions account…</div></main>:<AccountContent data={data} snapshot={snapshot}/>} 
  </div>;
}

function AccountContent({data,snapshot}:{data:RegistryState;snapshot:OnboardingSnapshot|null}){
  if(!data.user)return <main className="as-shell as-signin"><section><span>ACCOUNT</span><h1>Your Sessions account.</h1><p>Sign in to manage your identity, security and marketplace relationships.</p></section><div className="as-card"><AuthSignIn returnTo="/account"/></div></main>;

  const user=data.user;
  const bookings=data.bookings.filter(booking=>booking.customer===user.id);
  const upcoming=bookings.filter(booking=>['requested','confirmed'].includes(booking.status));
  const memberships=(data.memberships||[]).filter(member=>member.customer===user.id&&member.status==='active');
  const managed=data.studios.filter(studio=>data.managedIds.includes(studio.id));
  const contexts=snapshot?.contexts.filter(context=>context.status==='active')||[];
  const invitationContacts=[user.phone,user.email?.toLowerCase()].filter(Boolean) as string[];
  const invitations=data.invitations.filter(member=>invitationContacts.includes(member.inviteContact||member.email||''));
  const claims=data.claims.filter(claim=>claim.applicant===user.id&&claim.status==='pending');
  const relationships=[
    {label:'Active sessions',value:upcoming.length,href:'/requests',icon:CalendarDays},
    {label:'Studio memberships',value:memberships.length,href:'/subscriptions',icon:Users},
    {label:'Managed studios',value:managed.length,href:'/manage',icon:Building2},
  ];

  return <main className="as-shell">
    <section className="as-identity"><div className="as-avatar"><UserRound size={30}/></div><div><span>YOUR PROFILE</span><h1>{user.displayName}</h1><p>{user.email||user.phone||'Verified Sessions identity'}</p></div><CheckCircle2 size={22}/></section>

    <section className="as-metrics" aria-label="Marketplace relationships">{relationships.map(({label,value,href,icon:Icon})=><a href={href} key={label}><Icon size={20}/><span>{label}</span><strong>{value}</strong><ChevronRight size={17}/></a>)}</section>

    <div className="as-grid">
      <section className="as-card as-security"><div className="as-heading"><span className="as-icon"><ShieldCheck size={22}/></span><div><small>ACCESS & PRIVACY</small><h2>Account & security</h2><p>Manage sign-in, MFA, recovery details and authenticated devices.</p></div></div>{user.method!=='chatgpt_demo'?<AccountSecurity userId={user.id} contact={user.phone||user.email||user.id}/>:<div className="as-preview"><strong>Private UAT identity</strong><p>The ChatGPT Sites audience session is separate from Sessions production authentication.</p><a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out<ChevronRight size={17}/></a></div>}</section>

      <aside className="as-side">
        <section className="as-card"><small>WORKSPACES</small><h2>Your access</h2>{contexts.length?<div className="as-contexts">{contexts.map(context=><div key={`${context.type}:${context.id}`}><span className={'as-context-icon '+context.type}>{context.type==='personal'?<UserRound size={17}/>:context.type==='provider'?<Building2 size={17}/>:<ShieldCheck size={17}/>}</span><span><strong>{context.label}</strong><small>{context.type==='personal'?'Personal marketplace':context.type==='provider'?'Studio operations':'Sessions company'}</small></span></div>)}</div>:<p>No active workspace could be loaded.</p>}<a className="as-link" href="/mobile/profile">Open mobile Profile<ChevronRight size={17}/></a></section>
        {(invitations.length||claims.length)?<section className="as-card"><small>NEEDS ATTENTION</small><h2>Pending access</h2>{invitations.length?<p>{invitations.length} studio team invitation{invitations.length===1?'':'s'} waiting.</p>:null}{claims.length?<p>{claims.length} ownership claim{claims.length===1?'':'s'} under review.</p>:null}<a className="as-link" href="/manage">Review studio access<ChevronRight size={17}/></a></section>:null}
      </aside>
    </div>
  </main>;
}
