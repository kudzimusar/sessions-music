'use client';

import {useCallback,useEffect,useMemo,useState} from 'react';
import {
  ArrowLeft,ArrowRight,Building2,CalendarDays,Check,ChevronRight,Clock3,
  DoorOpen,LayoutList,MoreHorizontal,RefreshCw,Settings2,Users,X
} from 'lucide-react';
import {sessionFetch} from '@/lib/supabase-browser';
import {localDate,money,timeLabel} from '@/lib/domain';
import type {RegistryState,Studio,StudioBooking} from '@/lib/registry';

const emptyState:RegistryState={studios:[],staff:[],claims:[],bookings:[],issues:[],managedIds:[],ownerIds:[],invitations:[],myStaff:[],operator:false,user:null};
type Props={path:string};

export default function ProviderNative({path}:Props){
 const[data,setData]=useState<RegistryState>(emptyState),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(''),[studioId,setStudioId]=useState('');
 const refresh=useCallback(async()=>{try{const res=await sessionFetch('/api/registry',{cache:'no-store'});const body=await res.json() as RegistryState&{error?:string};if(!res.ok)throw new Error(body.error||'Studio workspace unavailable');setData(body);setStudioId(current=>current&&body.managedIds.includes(current)?current:(body.managedIds[0]||''));setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Studio workspace unavailable')}finally{setLoading(false)}},[]);
 useEffect(()=>{void refresh()},[refresh]);
 const studio=data.studios.find(item=>item.id===studioId);
 const managed=data.studios.filter(item=>data.managedIds.includes(item.id));
 const bookings=useMemo(()=>data.bookings.filter(item=>item.studioId===studioId),[data.bookings,studioId]);
 async function status(booking:StudioBooking,next:'confirmed'|'declined'){setBusy(booking.id+next);setError('');try{const res=await sessionFetch('/api/registry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'bookingStatus',studioId:booking.studioId,id:booking.id,status:next})});const body=await res.json() as {error?:string};if(!res.ok)throw new Error(body.error||'Booking could not be updated');await refresh()}catch(reason){setError(reason instanceof Error?reason.message:'Booking could not be updated')}finally{setBusy('')}}
 const sub=path.replace('/mobile/provider','')||'/';
 let screen:React.ReactNode;
 if(sub==='/requests')screen=<Requests studio={studio} bookings={bookings} busy={busy} status={status}/>;
 else if(sub==='/rooms')screen=<Rooms studio={studio}/>;
 else if(sub==='/more')screen=<More studio={studio}/>;
 else screen=<Today studio={studio} bookings={bookings} busy={busy} status={status}/>;
 return <div className="pn-app" data-sessions-surface="provider-native" data-native-prototype="true">
   <ProviderHeader studio={studio} managed={managed} studioId={studioId} setStudioId={setStudioId} loading={loading} refresh={refresh}/>
   {error?<div className="pn-error" role="alert">{error}</div>:null}
   {screen}
   <ProviderTabs path={path}/>
 </div>;
}

function ProviderHeader({studio,managed,studioId,setStudioId,loading,refresh}:{studio?:Studio;managed:Studio[];studioId:string;setStudioId:(id:string)=>void;loading:boolean;refresh:()=>Promise<void>}){
 return <header className="pn-header"><div className="pn-header-top"><a href="/mobile" className="pn-back" aria-label="Customer app"><ArrowLeft size={20}/></a><div><small>PROVIDER MODE</small><strong>{loading?'Loading studio…':studio?.name||'Studio workspace'}</strong></div><button className="pn-icon" onClick={()=>void refresh()} aria-label="Refresh"><RefreshCw size={19}/></button></div>{managed.length>1?<div className="pn-studio-switch">{managed.map(item=><button key={item.id} className={item.id===studioId?'active':''} onClick={()=>setStudioId(item.id)}>{item.name}</button>)}</div>:null}</header>;
}

function Today({studio,bookings,busy,status}:{studio?:Studio;bookings:StudioBooking[];busy:string;status:(b:StudioBooking,s:'confirmed'|'declined')=>Promise<void>}){
 const today=localDate();const todays=bookings.filter(item=>item.date===today&&['requested','confirmed'].includes(item.status)).sort((a,b)=>a.start-b.start);const requested=bookings.filter(item=>item.status==='requested').sort((a,b)=>`${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`));
 return <main className="pn-screen"><section className="pn-greeting"><small>{new Date(today+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</small><h1>Today at<br/>{studio?.name||'your studio'}</h1><div className="pn-stats"><span><strong>{todays.length}</strong><small>today</small></span><span><strong>{requested.length}</strong><small>requests</small></span><span><strong>{studio?.rooms.length||0}</strong><small>rooms</small></span></div></section><section className="pn-section"><div className="pn-section-head"><div><small>TODAY</small><h2>Session timeline</h2></div><a href="/mobile/provider/requests">Requests</a></div>{todays.length?<div className="pn-timeline">{todays.map(item=><ProviderBooking key={item.id} booking={item} busy={busy} status={status}/>)}</div>:<div className="pn-empty"><CalendarDays size={25}/><h3>No Sessions bookings today</h3><p>Your live daily operations will appear here without bringing the desktop dashboard onto your phone.</p></div>}</section>{requested.length?<section className="pn-section"><div className="pn-section-head"><div><small>NEEDS ACTION</small><h2>New requests</h2></div><span>{requested.length}</span></div><div className="pn-request-preview">{requested.slice(0,3).map(item=><ProviderBooking key={item.id} booking={item} busy={busy} status={status}/>)}</div></section>:null}</main>;
}

function Requests({studio,bookings,busy,status}:{studio?:Studio;bookings:StudioBooking[];busy:string;status:(b:StudioBooking,s:'confirmed'|'declined')=>Promise<void>}){
 const requested=bookings.filter(item=>item.status==='requested').sort((a,b)=>`${a.date}-${a.start}`.localeCompare(`${b.date}-${b.start}`));
 return <main className="pn-screen"><section className="pn-title"><small>BOOKING REQUESTS</small><h1>{requested.length?`${requested.length} waiting`:'You’re caught up.'}</h1><p>{studio?.name||'Studio'} · only actions that matter on the move.</p></section><section className="pn-section no-top">{requested.length?<div className="pn-request-list">{requested.map(item=><ProviderBooking key={item.id} booking={item} busy={busy} status={status}/>)}</div>:<div className="pn-empty"><Check size={27}/><h3>No pending requests</h3><p>New booking requests will appear here for quick accept or decline.</p></div>}</section></main>;
}

function ProviderBooking({booking,busy,status}:{booking:StudioBooking;busy:string;status:(b:StudioBooking,s:'confirmed'|'declined')=>Promise<void>}){
 const pending=booking.status==='requested';return <article className="pn-booking"><div className="pn-time"><strong>{timeLabel(booking.start)}</strong><span>{booking.duration} min</span></div><div className="pn-booking-body"><div><span className={'pn-state '+booking.status}>{booking.status}</span><h3>{booking.roomName}</h3><p>{booking.date===localDate()?'Today':new Date(booking.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})} · {booking.size} {booking.size===1?'person':'people'}</p><small>{booking.name}</small></div>{pending?<div className="pn-quick-actions"><button className="decline" disabled={!!busy} onClick={()=>void status(booking,'declined')}><X size={17}/>Decline</button><button className="accept" disabled={!!busy} onClick={()=>void status(booking,'confirmed')}><Check size={17}/>Accept</button></div>:null}</div></article>;
}

function Rooms({studio}:{studio?:Studio}){return <main className="pn-screen"><section className="pn-title"><small>ROOMS</small><h1>What’s running.</h1><p>Quick operational reference. Pricing, schedules and room configuration stay on desktop.</p></section><section className="pn-room-list">{studio?.rooms.length?studio.rooms.map(room=><article key={room.id}><span className="pn-room-icon"><DoorOpen size={21}/></span><div><h2>{room.name}</h2><p>Capacity {room.capacity} · minimum {room.minimum} min</p><small>{timeLabel(room.open)}–{timeLabel(room.close)} · {money(room.price)}/hr</small></div><span className="pn-live-dot">LIVE</span></article>):<div className="pn-empty"><DoorOpen size={27}/><h3>No configured rooms</h3><p>Use the provider desktop portal to configure rooms and availability.</p></div>}</section></main>}

function More({studio}:{studio?:Studio}){return <main className="pn-screen"><section className="pn-title"><small>PROVIDER TOOLS</small><h1>Mobile for today.<br/>Desktop for setup.</h1><p>Sessions keeps dense configuration in the PWA instead of squeezing it into a phone dashboard.</p></section><section className="pn-menu"><a href={studio?'/manage/'+studio.id:'/manage'}><span><Settings2 size={21}/><span><strong>Open full studio management</strong><small>Rooms, pricing, hours, staff and verification</small></span></span><ChevronRight size={18}/></a><a href="/manage"><span><LayoutList size={21}/><span><strong>Desktop provider portal</strong><small>Reports and long-range administration</small></span></span><ChevronRight size={18}/></a><a href="/account"><span><Users size={21}/><span><strong>Account & security</strong><small>Identity and session settings</small></span></span><ChevronRight size={18}/></a></section><div className="pn-boundary-note"><Building2 size={20}/><p><strong>Native provider scope:</strong> today’s sessions, booking requests, room status and urgent actions. Full administration remains intentionally desktop/PWA.</p></div></main>}

function ProviderTabs({path}:{path:string}){const items=[['/mobile/provider','Today',CalendarDays],['/mobile/provider/requests','Requests',LayoutList],['/mobile/provider/rooms','Rooms',DoorOpen],['/mobile/provider/more','More',MoreHorizontal]] as const;return <nav className="pn-tabs" aria-label="Provider mobile navigation">{items.map(([href,label,Icon])=><a key={href} className={path===href?'active':''} href={href}><Icon size={21}/><span>{label}</span></a>)}</nav>}
