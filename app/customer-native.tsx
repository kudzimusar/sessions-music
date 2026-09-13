'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  ArrowLeft,ArrowRight,AudioLines,Bell,Building2,CalendarDays,CheckCircle2,
  ChevronRight,Clock3,Compass,Headphones,Heart,Home,MapPin,Search,
  ShieldCheck,SlidersHorizontal,UserRound
} from 'lucide-react';
import BookingRequestV3 from './booking-request-v3';
import {sessionFetch} from '@/lib/supabase-browser';
import {money,prettyDate,timeLabel} from '@/lib/domain';
import type {RegistryAction} from './registry-ui';
import type {RegistryState,Studio} from '@/lib/registry';

const emptyState:RegistryState={
  studios:[],staff:[],claims:[],bookings:[],issues:[],managedIds:[],ownerIds:[],
  invitations:[],myStaff:[],operator:false,user:null,
};

type Props={path:string};
type Filter='all'|'rehearsal'|'recording'|'bookable';

const studioLabel=(studio:Studio)=>studio.status==='bookable'&&studio.bookingEnabled?'Bookable now':studio.status==='verified'?'Verified studio':studio.status==='pending_verification'?'Verification pending':studio.status==='claimed'?'Claimed profile':'Sourced profile';
const isBookable=(studio:Studio)=>studio.status==='bookable'&&studio.bookingEnabled&&studio.rooms.length>0;
const lowestRate=(studio:Studio)=>studio.rooms.filter(room=>room.price>0).sort((a,b)=>a.price-b.price)[0]?.price;
const imageFor=(studio:Studio,large=false)=>{
  const rehearsal=studio.services.some(service=>service.toLowerCase().includes('rehearsal'));
  const intimate=studio.services.some(service=>service.toLowerCase().includes('recording'))&&!rehearsal;
  if(intimate)return large?'/images/intimate.webp':'/images/intimate-card.webp';
  if(rehearsal)return large?'/images/hall.webp':'/images/hall-card.webp';
  return large?'/images/studio.webp':'/images/studio-card.webp';
};

export default function CustomerNative({path}:Props){
  const[data,setData]=useState<RegistryState>(emptyState);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  const refresh=useCallback(async()=>{
    try{
      const response=await sessionFetch('/api/registry',{cache:'no-store'});
      const body=await response.json() as RegistryState&{error?:string};
      if(!response.ok)throw new Error(body.error||'Sessions could not load.');
      setData(body);setError('');
    }catch(reason){setError(reason instanceof Error?reason.message:'Sessions could not load.')}
    finally{setLoading(false)}
  },[]);

  useEffect(()=>{void refresh();const changed=()=>void refresh();window.addEventListener('sessions-auth-changed',changed);return()=>window.removeEventListener('sessions-auth-changed',changed)},[refresh]);

  const mutate:RegistryAction=async(payload,message='Saved')=>{
    if(!data.user)throw new Error('Sign in required');
    setBusy(true);setError('');
    try{
      const settlementActions=['submitProof','confirmDirect','declineProof','openSettlementDispute','resolveSettlementDispute','issueInvoice'];
      const endpoint=settlementActions.includes(String(payload.type))?'/api/settlements':'/api/registry';
      const response=await sessionFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const body=await response.json() as {error?:string};
      if(!response.ok)throw new Error(body.error||'Unable to save');
      await refresh();
      return {...body,message};
    }finally{setBusy(false)}
  };

  const segments=path.split('/').filter(Boolean);
  const studioId=segments[0]==='mobile'&&segments[1]==='studio'?segments[2]:undefined;
  const studio=studioId?data.studios.find(item=>item.id===studioId):undefined;
  const booking=segments[3]==='book';
  const rootScreen=segments.length<=2&&!studioId;
  let screen:React.ReactNode;

  if(studioId){
    screen=booking?<NativeBooking studio={studio} data={data} loading={loading} busy={busy} mutate={mutate}/>:<StudioDetail studio={studio} loading={loading}/>;
  }else if(path==='/mobile/search')screen=<SearchScreen data={data} loading={loading}/>;
  else if(path==='/mobile/sessions')screen=<SessionsScreen data={data} loading={loading}/>;
  else if(path==='/mobile/saved')screen=<SavedScreen/>;
  else if(path==='/mobile/profile')screen=<ProfileScreen data={data} loading={loading}/>;
  else screen=<HomeScreen data={data} loading={loading}/>;

  return <div className="cn-app" data-sessions-surface="customer-native" data-native-prototype="true">
    {error?<div className="cn-error" role="alert"><span>{error}</span><button onClick={()=>void refresh()}>Retry</button></div>:null}
    {screen}
    {rootScreen?<NativeTabBar path={path}/>:null}
  </div>;
}

function NativeTopBar({title,action}:{title?:string;action?:React.ReactNode}){
  return <header className="cn-topbar"><div className="cn-wordmark"><span><AudioLines size={18}/></span>{title?<strong>{title}</strong>:<><strong>SESSIONS</strong><i>.</i></>}</div>{action}</header>;
}

function HomeScreen({data,loading}:{data:RegistryState;loading:boolean}){
  const studios=data.studios.filter(studio=>!studio.hidden).slice(0,8);
  const upcoming=data.user?data.bookings.filter(item=>item.customer===data.user?.id&&['requested','confirmed'].includes(item.status)).sort((a,b)=>`${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`))[0]:undefined;
  const upcomingStudio=upcoming?data.studios.find(item=>item.id===upcoming.studioId):undefined;
  return <main className="cn-screen cn-home-screen">
    <NativeTopBar action={<a className="cn-icon-button" href="/notifications" aria-label="Notifications"><Bell size={20}/></a>}/>
    <section className="cn-home-intro"><span>HARARE · ZIMBABWE</span><h1>Find your next<br/><em>rehearsal room.</em></h1><a className="cn-search-entry" href="/mobile/search"><Search size={20}/><span>Where do you want to rehearse?</span></a></section>

    {upcoming&&upcomingStudio?<section className="cn-section"><div className="cn-section-title"><div><small>NEXT SESSION</small><h2>Coming up</h2></div><a href="/mobile/sessions">See all</a></div><a className="cn-next-row" href="/mobile/sessions"><span className="cn-date-tile"><strong>{upcoming.date.slice(8)}</strong><small>{new Date(upcoming.date+'T12:00:00').toLocaleDateString('en',{month:'short'}).toUpperCase()}</small></span><span><strong>{upcomingStudio.name}</strong><small>{timeLabel(upcoming.start)} · {upcoming.roomName}</small><b>{upcoming.status}</b></span><ChevronRight size={19}/></a></section>:null}

    <section className="cn-section cn-edge-section"><div className="cn-section-title cn-padded"><div><small>DISCOVER</small><h2>Spaces for your sound</h2></div><a href="/mobile/search">Search</a></div>
      {loading?<NativeSkeleton/>:<div className="cn-horizontal-list">{studios.map(studio=><StudioPoster key={studio.id} studio={studio}/>)}</div>}
    </section>

    <section className="cn-section"><button className="cn-native-banner" onClick={()=>window.location.assign('/mobile/search')}><span><Compass size={22}/></span><div><small>EXPLORE HARARE</small><strong>Search by area, service and availability</strong></div><ChevronRight size={20}/></button></section>

    <section className="cn-section cn-provider-entry"><div><span className="cn-round-icon"><Building2 size={21}/></span><div><small>STUDIO OWNER?</small><h2>Run today’s studio work from mobile.</h2><p>Daily provider operations get their own native surface. Full configuration stays on desktop.</p></div></div><a href="/mobile/provider">Open provider mode<ArrowRight size={16}/></a></section>
  </main>;
}

function SearchScreen({data,loading}:{data:RegistryState;loading:boolean}){
  const[query,setQuery]=useState('');
  const[filter,setFilter]=useState<Filter>('all');
  const visible=useMemo(()=>data.studios.filter(item=>!item.hidden).filter(studio=>{
    const text=`${studio.name} ${studio.area} ${studio.address} ${studio.services.join(' ')}`.toLowerCase();
    if(query&&!text.includes(query.toLowerCase()))return false;
    if(filter==='rehearsal'&&!studio.services.some(service=>service.toLowerCase().includes('rehearsal')))return false;
    if(filter==='recording'&&!studio.services.some(service=>service.toLowerCase().includes('recording')))return false;
    if(filter==='bookable'&&!isBookable(studio))return false;
    return true;
  }),[data.studios,query,filter]);
  return <main className="cn-screen cn-search-screen">
    <NativeTopBar title="Search" action={<button className="cn-icon-button" aria-label="Filters"><SlidersHorizontal size={20}/></button>}/>
    <div className="cn-sticky-search"><div className="cn-search-field"><Search size={19}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Studio, area or service" aria-label="Search studios"/></div><div className="cn-chip-scroll">{([['all','All'],['rehearsal','Rehearsal'],['recording','Recording'],['bookable','Bookable']] as const).map(([value,label])=><button key={value} className={filter===value?'active':''} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
    <section className="cn-result-list"><div className="cn-result-count"><strong>{loading?'Searching…':`${visible.length} ${visible.length===1?'space':'spaces'}`}</strong><span>Harare</span></div>{loading?<NativeSkeleton/>:visible.length?visible.map(studio=><StudioResult key={studio.id} studio={studio}/>):<NativeEmpty icon={<Headphones/>} title="No matching spaces">Try another area, studio name or filter.</NativeEmpty>}</section>
    <NativeTabBar path="/mobile/search"/>
  </main>;
}

function StudioPoster({studio}:{studio:Studio}){
  const rate=lowestRate(studio);
  return <a className="cn-poster" href={'/mobile/studio/'+studio.id}><div className="cn-photo"><img src={imageFor(studio)} alt=""/><span className={isBookable(studio)?'live':''}>{isBookable(studio)?'Bookable':'Profile'}</span></div><strong>{studio.name}</strong><small><MapPin size={12}/>{studio.area}</small><b>{rate?`from ${money(rate)}/hr`:'Rates not published'}</b></a>;
}

function StudioResult({studio}:{studio:Studio}){
  const rate=lowestRate(studio);
  return <a className="cn-result-row" href={'/mobile/studio/'+studio.id}><img src={imageFor(studio)} alt=""/><div><span className="cn-status-text">{studioLabel(studio)}</span><h3>{studio.name}</h3><p><MapPin size={13}/>{studio.area}</p><div className="cn-tag-line">{studio.services.slice(0,3).map(service=><span key={service}>{service}</span>)}</div><strong>{rate?`from ${money(rate)}/hr`:'Rates not published'}</strong></div><ChevronRight size={19}/></a>;
}

function StudioDetail({studio,loading}:{studio?:Studio;loading:boolean}){
  if(loading)return <main className="cn-screen"><NativeSkeleton/></main>;
  if(!studio)return <main className="cn-screen"><NativeBack href="/mobile/search"/><NativeEmpty icon={<Headphones/>} title="Studio unavailable">This profile is not available right now.</NativeEmpty></main>;
  const rate=lowestRate(studio);
  return <main className="cn-screen cn-detail-screen">
    <section className="cn-detail-hero"><img src={imageFor(studio,true)} alt=""/><div className="cn-detail-overlay"><NativeBack href="/mobile/search" light/><button className="cn-icon-button light" aria-label="Save studio"><Heart size={20}/></button></div></section>
    <section className="cn-detail-body"><span className="cn-detail-status"><ShieldCheck size={14}/>{studioLabel(studio)}</span><h1>{studio.name}</h1><p className="cn-detail-location"><MapPin size={15}/>{studio.area}, Harare</p><div className="cn-detail-summary"><div><small>From</small><strong>{rate?`${money(rate)}/hr`:'—'}</strong></div><div><small>Rooms</small><strong>{studio.rooms.length||'—'}</strong></div><div><small>Type</small><strong>{studio.category}</strong></div></div>
      <div className="cn-native-section"><h2>About this space</h2><p>{studio.description}</p></div>
      <div className="cn-native-section"><h2>What you can do here</h2><div className="cn-feature-list">{studio.services.map(service=><span key={service}><CheckCircle2 size={17}/>{service}</span>)}</div></div>
      {studio.equipment?<div className="cn-native-section"><h2>Equipment</h2><p>{studio.equipment}</p></div>:null}
      {studio.rooms.length?<div className="cn-native-section"><h2>Rooms</h2><div className="cn-room-list">{studio.rooms.map(room=><div key={room.id}><span><strong>{room.name}</strong><small>Up to {room.capacity} people · minimum {room.minimum} min</small></span><b>{money(room.price)}/hr</b></div>)}</div></div>:null}
      <div className="cn-native-section"><h2>Before you go</h2><div className="cn-info-rows"><div><span>Address</span><strong>{studio.address}</strong></div><div><span>Booking</span><strong>{isBookable(studio)?'Available through Sessions':'Not enabled yet'}</strong></div>{studio.rules?<div><span>Studio rules</span><strong>{studio.rules}</strong></div>:null}</div></div>
    </section>
    <div className="cn-sticky-cta"><div><small>{rate?'FROM':'BOOKING'}</small><strong>{rate?`${money(rate)}/hr`:(isBookable(studio)?'Choose a room':'Unavailable')}</strong></div>{isBookable(studio)?<a href={'/mobile/studio/'+studio.id+'/book'}>Choose a time</a>:<button disabled>Not bookable yet</button>}</div>
  </main>;
}

function NativeBooking({studio,data,loading,busy,mutate}:{studio?:Studio;data:RegistryState;loading:boolean;busy:boolean;mutate:RegistryAction}){
  if(loading)return <main className="cn-screen"><NativeSkeleton/></main>;
  if(!studio)return <main className="cn-screen"><NativeBack href="/mobile/search"/><NativeEmpty icon={<CalendarDays/>} title="Booking unavailable">This studio could not be loaded.</NativeEmpty></main>;
  return <main className="cn-screen cn-book-screen"><header className="cn-book-header"><NativeBack href={'/mobile/studio/'+studio.id}/><div><small>BOOK A SESSION</small><strong>{studio.name}</strong></div></header><div className="cn-book-intro"><h1>Choose your session.</h1><p>Pick one room, date and start time. Sessions checks the real inventory before saving your request.</p></div><BookingRequestV3 studio={studio} data={data} mutate={mutate} busy={busy}/></main>;
}

function SessionsScreen({data,loading}:{data:RegistryState;loading:boolean}){
  const mine=data.user?data.bookings.filter(item=>item.customer===data.user?.id).sort((a,b)=>`${b.date}-${b.start}`.localeCompare(`${a.date}-${a.start}`)):[];
  const active=mine.filter(item=>['requested','confirmed'].includes(item.status));
  const history=mine.filter(item=>!['requested','confirmed'].includes(item.status));
  return <main className="cn-screen"><NativeTopBar title="My sessions"/><section className="cn-session-section"><div className="cn-section-title"><div><small>UPCOMING</small><h2>{active.length?`${active.length} active`:'Nothing scheduled'}</h2></div></div>{loading?<NativeSkeleton/>:active.length?<div className="cn-native-list">{active.map(item=>{const studio=data.studios.find(value=>value.id===item.studioId);return <a key={item.id} href="/requests"><span className="cn-date-tile"><strong>{item.date.slice(8)}</strong><small>{new Date(item.date+'T12:00:00').toLocaleDateString('en',{month:'short'}).toUpperCase()}</small></span><span><strong>{studio?.name||'Studio session'}</strong><small>{prettyDate(item.date)} · {timeLabel(item.start)} · {item.roomName}</small><b>{item.status}</b></span><ChevronRight size={18}/></a>})}</div>:<NativeEmpty icon={<CalendarDays/>} title="Your next session starts here">Find a rehearsal room and request a time.</NativeEmpty>}</section>{history.length?<section className="cn-session-section"><div className="cn-section-title"><div><small>HISTORY</small><h2>Past activity</h2></div></div><div className="cn-native-list compact">{history.slice(0,8).map(item=><a key={item.id} href="/requests"><span><strong>{data.studios.find(value=>value.id===item.studioId)?.name||item.roomName}</strong><small>{prettyDate(item.date)} · {item.status}</small></span><ChevronRight size={18}/></a>)}</div></section>:null}<NativeTabBar path="/mobile/sessions"/></main>;
}

function SavedScreen(){return <main className="cn-screen"><NativeTopBar title="Saved"/><div className="cn-centered-state"><NativeEmpty icon={<Heart/>} title="Keep your shortlist here">Saved studios are part of the native product direction. This Phase 1–5 correction does not invent favourites that are not yet stored by the backend.</NativeEmpty><a className="cn-primary-link" href="/mobile/search">Explore studios</a></div><NativeTabBar path="/mobile/saved"/></main>}

function ProfileScreen({data,loading}:{data:RegistryState;loading:boolean}){
  if(loading)return <main className="cn-screen"><NativeSkeleton/></main>;
  const user=data.user;
  return <main className="cn-screen"><NativeTopBar title="Profile"/><section className="cn-profile-head"><span className="cn-profile-avatar"><UserRound size={26}/></span><div><h1>{user?.displayName||'Sessions account'}</h1><p>{user?.email||user?.phone||'Verified identity'}</p></div></section><section className="cn-settings-list"><a href="/account"><span><ShieldCheck size={20}/><span><strong>Account & security</strong><small>Identity, MFA and sessions</small></span></span><ChevronRight size={18}/></a><a href="/notifications"><span><Bell size={20}/><span><strong>Notifications</strong><small>Booking and service updates</small></span></span><ChevronRight size={18}/></a>{data.managedIds.length?<a href="/mobile/provider"><span><Building2 size={20}/><span><strong>Switch to provider mode</strong><small>Today’s studio operations</small></span></span><ChevronRight size={18}/></a>:<a href="/onboarding/provider"><span><Building2 size={20}/><span><strong>Manage a studio</strong><small>Claim or register a provider</small></span></span><ChevronRight size={18}/></a>}<a href="/help"><span><Headphones size={20}/><span><strong>Help & support</strong><small>Get assistance</small></span></span><ChevronRight size={18}/></a></section><section className="cn-web-note"><strong>Desktop/PWA still exists.</strong><p>Advanced account and provider administration can open in the browser surface without changing this mobile app structure.</p></section><NativeTabBar path="/mobile/profile"/></main>;
}

function NativeTabBar({path}:{path:string}){
  const tabs=[['/mobile','Home',Home],['/mobile/search','Search',Search],['/mobile/sessions','Sessions',CalendarDays],['/mobile/saved','Saved',Heart],['/mobile/profile','Profile',UserRound]] as const;
  return <nav className="cn-tabbar" aria-label="Mobile app navigation">{tabs.map(([href,label,Icon])=><a key={href} className={path===href?'active':''} href={href}><Icon size={21}/><span>{label}</span></a>)}</nav>;
}

function NativeBack({href,light=false}:{href:string;light?:boolean}){return <a className={'cn-back '+(light?'light':'')} href={href} aria-label="Go back"><ArrowLeft size={21}/></a>}
function NativeSkeleton(){return <div className="cn-skeleton" aria-label="Loading"><span/><span/><span/></div>}
function NativeEmpty({icon,title,children}:{icon:React.ReactNode;title:string;children:React.ReactNode}){return <div className="cn-empty"><span>{icon}</span><h2>{title}</h2><p>{children}</p></div>}
