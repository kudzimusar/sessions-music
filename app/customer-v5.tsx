'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  ArrowRight,AudioLines,Bell,Building2,CalendarDays,CheckCircle2,ChevronRight,
  Clock3,Compass,Headphones,MapPin,Search,ShieldCheck,Smartphone,UserRound,Users
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {AuthSignIn,AccountSecurity} from './production-auth';
import {sessionFetch} from '@/lib/supabase-browser';
import {localDate,money,prettyDate,timeLabel} from '@/lib/domain';
import type {RegistryState,Studio,Staff} from '@/lib/registry';

const emptyState:RegistryState={
  studios:[],staff:[],claims:[],bookings:[],issues:[],managedIds:[],ownerIds:[],
  invitations:[],myStaff:[],operator:false,user:null,
};

type Props={path:'/account'|'/mobile'};

type ActionPayload=Record<string,unknown>;

const studioLabel=(studio:Studio)=>studio.status==='bookable'&&studio.bookingEnabled?'Bookable now':studio.status==='verified'?'Verified studio':studio.status==='pending_verification'?'Verification pending':studio.status==='claimed'?'Claimed profile':'Sourced profile';
const studioTone=(studio:Studio)=>studio.status==='bookable'&&studio.bookingEnabled?'live':studio.status==='verified'?'verified':'sourced';
const initials=(value:string)=>value.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('')||'S';

export default function CustomerV5({path}:Props){
  const[data,setData]=useState<RegistryState>(emptyState);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[busy,setBusy]=useState('');

  const refresh=useCallback(async()=>{
    try{
      const response=await sessionFetch('/api/registry',{cache:'no-store'});
      const next=await response.json() as RegistryState&{error?:string};
      if(!response.ok)throw new Error(next.error||'Could not load Sessions');
      setData(next);setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'Could not load Sessions')}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{
    void refresh();
    const onAuth=()=>void refresh();
    window.addEventListener('sessions-auth-changed',onAuth);
    return()=>window.removeEventListener('sessions-auth-changed',onAuth);
  },[refresh]);

  const mutate=async(payload:ActionPayload,key:string)=>{
    setBusy(key);setError('');
    try{
      const response=await sessionFetch('/api/registry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const next=await response.json() as {error?:string};
      if(!response.ok)throw new Error(next.error||'Unable to save');
      await refresh();
    }catch(reason){setError(reason instanceof Error?reason.message:'Unable to save')}
    finally{setBusy('')}
  };

  return <div className="cv5-shell" data-sessions-surface="customer-v5">
    <CustomerHeader path={path} data={data}/>
    {error?<div className="cv5-alert" role="alert"><span>{error}</span><button onClick={()=>void refresh()}>Retry</button></div>:null}
    {path==='/mobile'?<MobileHome data={data} loading={loading}/>:<AccountDashboard data={data} loading={loading} busy={busy} mutate={mutate}/>} 
    <CustomerBottomNav path={path}/>
  </div>;
}

function CustomerHeader({path,data}:{path:Props['path'];data:RegistryState}){
  const unread=(data.notifications||[]).filter(item=>item.status==='available'||item.status==='pending').length;
  return <header className="cv5-topbar">
    <a className="cv5-brand" href="/mobile" aria-label="Sessions home"><span><AudioLines size={22}/></span><strong>SESSIONS</strong><i>.</i></a>
    <nav className="cv5-desktop-nav" aria-label="Customer navigation">
      <a className={path==='/mobile'?'active':''} href="/mobile">Discover</a>
      <a href="/map">Map</a>
      <a href="/requests">Sessions</a>
      <a href="/manage">Studio</a>
    </nav>
    <div className="cv5-top-actions">
      <a className="cv5-icon-link" href="/notifications" aria-label="Notifications"><Bell size={19}/>{unread>0?<span>{Math.min(unread,9)}</span>:null}</a>
      <a className={'cv5-avatar-link '+(path==='/account'?'active':'')} href="/account" aria-label="Your account">{data.user?initials(data.user.displayName):<UserRound size={19}/>}</a>
    </div>
  </header>;
}

function MobileHome({data,loading}:{data:RegistryState;loading:boolean}){
  const[query,setQuery]=useState('');
  const[filter,setFilter]=useState<'all'|'rehearsal'|'recording'|'bookable'>('all');
  const visible=useMemo(()=>data.studios.filter(studio=>!studio.hidden).filter(studio=>{
    const text=`${studio.name} ${studio.area} ${studio.address} ${studio.services.join(' ')}`.toLowerCase();
    if(query&&!text.includes(query.toLowerCase()))return false;
    if(filter==='rehearsal'&&!studio.services.some(service=>service.toLowerCase().includes('rehearsal')))return false;
    if(filter==='recording'&&!studio.services.some(service=>service.toLowerCase().includes('recording')))return false;
    if(filter==='bookable'&&!(studio.status==='bookable'&&studio.bookingEnabled))return false;
    return true;
  }).slice(0,8),[data.studios,query,filter]);
  const upcoming=data.user?data.bookings.filter(booking=>booking.customer===data.user?.id&&['requested','confirmed'].includes(booking.status)).sort((a,b)=>`${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`))[0]:undefined;
  const upcomingStudio=upcoming?data.studios.find(studio=>studio.id===upcoming.studioId):undefined;

  return <main className="cv5-mobile-main">
    <section className="cv5-mobile-hero">
      <div className="cv5-mobile-kicker"><MapPin size={14}/>HARARE · ZIMBABWE</div>
      <h1>{data.user?<>Find the room<br/>for your <em>next session.</em></>:<>Rehearsal space,<br/><em>without the runaround.</em></>}</h1>
      <p>Search sourced studios, check verified availability and keep every booking in one Sessions account.</p>
      <div className="cv5-search"><Search size={20}/><input aria-label="Search studios" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Studio, area or service"/></div>
    </section>

    {upcoming&&upcomingStudio?<section className="cv5-next-session">
      <div><span className="cv5-section-kicker">NEXT SESSION</span><h2>{upcomingStudio.name}</h2><p><CalendarDays size={15}/>{prettyDate(upcoming.date)} · {timeLabel(upcoming.start)} · {upcoming.roomName}</p></div>
      <a href="/requests">Open<ArrowRight size={16}/></a>
    </section>:null}

    <section className="cv5-discover">
      <div className="cv5-section-heading"><div><span className="cv5-section-kicker">DISCOVER</span><h2>Spaces around Harare</h2></div><a href="/map">Map <MapPin size={15}/></a></div>
      <div className="cv5-chips" role="group" aria-label="Studio filters">
        {([['all','All'],['rehearsal','Rehearsal'],['recording','Recording'],['bookable','Bookable']] as const).map(([value,label])=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}</button>)}
      </div>
      {loading?<div className="cv5-loading">Loading the registry…</div>:visible.length?<div className="cv5-studio-list">{visible.map(studio=><StudioTile key={studio.id} studio={studio}/>)}</div>:<div className="cv5-empty"><Headphones size={28}/><h3>No matching spaces</h3><p>Try another service, area or studio name.</p></div>}
      <a className="cv5-wide-link" href="/studios">Browse the full registry<ArrowRight size={16}/></a>
    </section>

    <section className="cv5-owner-cta"><div><Building2 size={24}/><span>RUN A STUDIO?</span></div><h2>Turn a sourced profile into your studio workspace.</h2><p>Claim ownership, add rooms and publish availability only after independent review.</p><a href="/manage">Open studio workspace<ArrowRight size={17}/></a></section>
  </main>;
}

function StudioTile({studio}:{studio:Studio}){
  const lowest=studio.rooms.filter(room=>room.price>0).sort((a,b)=>a.price-b.price)[0];
  return <a className="cv5-studio-tile" href={'/studio/'+studio.id}>
    <div className="cv5-studio-mark"><span>{initials(studio.name)}</span><AudioLines size={20}/></div>
    <div className="cv5-studio-copy"><div className="cv5-studio-title"><h3>{studio.name}</h3><ChevronRight size={18}/></div><p><MapPin size={13}/>{studio.area}</p><div className="cv5-service-row">{studio.services.slice(0,3).map(service=><span key={service}>{service}</span>)}</div><div className="cv5-studio-meta"><span className={'cv5-status '+studioTone(studio)}>{studioLabel(studio)}</span><strong>{lowest?`from ${money(lowest.price)}/hr`:'Rates not published'}</strong></div></div>
  </a>;
}

function AccountDashboard({data,loading,busy,mutate}:{data:RegistryState;loading:boolean;busy:string;mutate:(payload:ActionPayload,key:string)=>Promise<void>}){
  if(loading)return <main className="cv5-account-main"><div className="cv5-loading account">Loading your Sessions account…</div></main>;
  if(!data.user)return <main className="cv5-account-main"><section className="cv5-signin-hero"><span className="cv5-section-kicker">ONE ACCOUNT · EVERY SIDE</span><h1>Your music life,<br/><em>in one Sessions account.</em></h1><p>Bookings, memberships, studio access and team invitations stay tied to one verified identity.</p></section><div className="cv5-signin-card"><AuthSignIn returnTo="/account"/></div></main>;

  const user=data.user;
  const bookings=data.bookings.filter(booking=>booking.customer===user.id);
  const upcoming=bookings.filter(booking=>['requested','confirmed'].includes(booking.status));
  const memberships=(data.memberships||[]).filter(member=>member.customer===user.id);
  const activeMemberships=memberships.filter(member=>member.status==='active');
  const claims=data.claims.filter(claim=>claim.applicant===user.id);
  const invitationContacts=[user.phone,user.email?.toLowerCase()].filter(Boolean) as string[];
  const invitations=data.invitations.filter(member=>invitationContacts.includes(member.inviteContact||member.email||''));
  const managed=data.studios.filter(studio=>data.managedIds.includes(studio.id));
  const nextBooking=upcoming.sort((a,b)=>`${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`))[0];
  const nextStudio=nextBooking?data.studios.find(studio=>studio.id===nextBooking.studioId):undefined;

  return <main className="cv5-account-main">
    <section className="cv5-account-hero">
      <div><span className="cv5-section-kicker">YOUR SESSIONS</span><h1>Hi, {user.displayName.split(' ')[0]}.</h1><p>{upcoming.length?`You have ${upcoming.length} active ${upcoming.length===1?'session':'sessions'} to keep moving.`:'Your next rehearsal starts with the right room.'}</p></div>
      <div className="cv5-identity"><span className="cv5-user-avatar">{initials(user.displayName)}</span><div><strong>{user.displayName}</strong><small>{user.email||user.phone||'Verified Sessions identity'}</small></div><CheckCircle2 size={19}/></div>
    </section>

    <section className="cv5-quick-actions" aria-label="Quick actions">
      <a href="/mobile"><Compass size={20}/><span><strong>Find a studio</strong><small>Search Harare spaces</small></span><ChevronRight size={17}/></a>
      <a href="/requests"><CalendarDays size={20}/><span><strong>My sessions</strong><small>{upcoming.length?`${upcoming.length} active`:'No active requests'}</small></span><ChevronRight size={17}/></a>
      <a href="/manage"><Building2 size={20}/><span><strong>Studio workspace</strong><small>{managed.length?`${managed.length} managed`:'Claim or register'}</small></span><ChevronRight size={17}/></a>
      <a href="/notifications"><Bell size={20}/><span><strong>Updates</strong><small>Booking notifications</small></span><ChevronRight size={17}/></a>
    </section>

    <div className="cv5-account-grid">
      <div className="cv5-account-column">
        <section className="cv5-card cv5-session-card"><div className="cv5-card-heading"><div><span className="cv5-section-kicker">NEXT UP</span><h2>Your next session</h2></div><a href="/requests">All sessions</a></div>{nextBooking&&nextStudio?<div className="cv5-booking-summary"><div className="cv5-date-block"><strong>{new Date(nextBooking.date+'T00:00:00').toLocaleDateString('en-US',{day:'2-digit'})}</strong><span>{new Date(nextBooking.date+'T00:00:00').toLocaleDateString('en-US',{month:'short'}).toUpperCase()}</span></div><div><h3>{nextStudio.name}</h3><p><Clock3 size={14}/>{timeLabel(nextBooking.start)} · {nextBooking.roomName}</p><span className={'cv5-booking-state '+nextBooking.status}>{nextBooking.status.replace('_',' ')}</span></div><a href="/requests"><ChevronRight size={20}/></a></div>:<div className="cv5-card-empty"><CalendarDays size={25}/><div><h3>No active sessions</h3><p>Find a room and send your first request.</p></div><a href="/mobile">Explore<ArrowRight size={15}/></a></div>}</section>

        <section className="cv5-card"><div className="cv5-card-heading"><div><span className="cv5-section-kicker">MEMBERSHIPS</span><h2>Studio memberships</h2></div><span>{activeMemberships.length} active</span></div>{memberships.length?<div className="cv5-list">{memberships.slice(0,4).map(member=>{const studio=data.studios.find(item=>item.id===member.studioId);return <a href={'/studio/'+member.studioId} key={member.id}><span className="cv5-list-icon"><Users size={18}/></span><span><strong>{studio?.name||member.name}</strong><small>{member.plan.name} · {member.status}{member.expiresOn?` · to ${member.expiresOn}`:''}</small></span><ChevronRight size={17}/></a>})}</div>:<div className="cv5-card-empty"><Users size={24}/><div><h3>No memberships yet</h3><p>Studio-run plans appear here after you join.</p></div></div>}<a className="cv5-card-footer-link" href="/subscriptions">Plans & subscriptions<ArrowRight size={15}/></a></section>

        <section className="cv5-card"><div className="cv5-card-heading"><div><span className="cv5-section-kicker">STUDIO ACCESS</span><h2>Ownership & management</h2></div><span>{managed.length} workspace{managed.length===1?'':'s'}</span></div>{managed.length?<div className="cv5-list">{managed.map(studio=><a href={'/manage/'+studio.id} key={studio.id}><span className="cv5-list-icon royal"><Building2 size={18}/></span><span><strong>{studio.name}</strong><small>{studioLabel(studio)}</small></span><ChevronRight size={17}/></a>)}</div>:null}{claims.length?<div className="cv5-claims">{claims.map(claim=>{const studio=data.studios.find(item=>item.id===claim.studioId);return <div key={claim.id}><span className={'cv5-claim-state '+claim.status}>{claim.status}</span><div><strong>{studio?.name||'Studio claim'}</strong><small>{claim.status==='pending'?`Review reference ${claim.code}`:claim.note||'Ownership review updated'}</small></div></div>})}</div>:managed.length===0?<div className="cv5-card-empty"><Building2 size={24}/><div><h3>No studio access yet</h3><p>Find an existing profile or register a missing studio.</p></div></div>:null}<a className="cv5-card-footer-link" href="/register">Register or track a studio<ArrowRight size={15}/></a></section>
      </div>

      <aside className="cv5-account-side">
        <section className="cv5-side-card royal"><ShieldCheck size={27}/><span className="cv5-section-kicker">IDENTITY</span><h2>One verified person.<br/>Multiple workspaces.</h2><p>Your musician, provider and company access stay attached to this identity. Roles do not duplicate your account.</p>{data.operator?<a href="/corporate">Corporate workspace<ArrowRight size={15}/></a>:<a href="/manage">Studio workspace<ArrowRight size={15}/></a>}</section>

        <section className="cv5-card"><div className="cv5-card-heading"><div><span className="cv5-section-kicker">TEAM</span><h2>Invitations</h2></div><span>{invitations.length}</span></div>{invitations.length?<div className="cv5-invitations">{invitations.map(invitation=><InvitationCard key={invitation.id} invitation={invitation} studio={data.studios.find(studio=>studio.id===invitation.studioId)} busy={busy} mutate={mutate}/>)}</div>:<div className="cv5-mini-empty"><Users size={20}/><p>No pending studio invitations.</p></div>}</section>

        <section className="cv5-side-card black"><Smartphone size={25}/><span className="cv5-section-kicker">SESSIONS MOBILE</span><h2>Your rehearsal tools, in your pocket.</h2><p>Use the dedicated mobile home for faster discovery and session access.</p><a href="/mobile">Open mobile home<ArrowRight size={15}/></a></section>
      </aside>
    </div>

    {user.method!=='chatgpt_demo'?<section className="cv5-security"><div className="cv5-section-heading"><div><span className="cv5-section-kicker">ACCESS & PRIVACY</span><h2>Security controls</h2></div></div><AccountSecurity userId={user.id} contact={user.phone||user.email||user.id}/></section>:<section className="cv5-preview-signout"><span>Private preview identity</span><a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a></section>}
  </main>;
}

function InvitationCard({invitation,studio,busy,mutate}:{invitation:Staff;studio?:Studio;busy:string;mutate:(payload:ActionPayload,key:string)=>Promise<void>}){
  const key='invite-'+invitation.id;
  return <article className="cv5-invite"><div className="cv5-list-icon royal"><Building2 size={18}/></div><div><strong>{studio?.name||'Studio team'}</strong><small>{invitation.role} · invited to join</small></div><div className="cv5-invite-actions"><Button size="sm" disabled={!!busy} onClick={()=>void mutate({type:'staffProfile',studioId:invitation.studioId,id:invitation.id,name:invitation.name,title:invitation.title,bio:invitation.bio,skills:invitation.skills,public:false,consent:true},key)}>Accept</Button><button disabled={!!busy} onClick={()=>void mutate({type:'removeStaff',studioId:invitation.studioId,id:invitation.id},key)}>Decline</button></div></article>;
}

function CustomerBottomNav({path}:{path:Props['path']}){
  const items=[
    {href:'/mobile',label:'Explore',icon:Compass,active:path==='/mobile'},
    {href:'/map',label:'Map',icon:MapPin,active:false},
    {href:'/requests',label:'Sessions',icon:CalendarDays,active:false},
    {href:'/manage',label:'Studio',icon:Building2,active:false},
    {href:'/account',label:'You',icon:UserRound,active:path==='/account'},
  ];
  return <nav className="cv5-bottom-nav" aria-label="Mobile navigation">{items.map(({href,label,icon:Icon,active})=><a key={href} href={href} className={active?'active':''}><Icon size={20}/><span>{label}</span></a>)}</nav>;
}
