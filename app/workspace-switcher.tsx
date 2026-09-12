'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Building2,ChevronDown,ShieldCheck,UserRound} from 'lucide-react';
import {sessionFetch} from '@/lib/supabase-browser';
import type {OnboardingSnapshot,WorkspaceContext} from '@/lib/onboarding-server';

const icon=(type:WorkspaceContext['type'])=>type==='personal'?<UserRound size={17}/>:type==='provider'?<Building2 size={17}/>:<ShieldCheck size={17}/>;
const target=(type:WorkspaceContext['type'])=>type==='personal'?'/mobile':type==='provider'?'/manage':'/corporate';

export default function WorkspaceSwitcher(){
 const[snapshot,setSnapshot]=useState<OnboardingSnapshot|null>(null),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{let alive=true;sessionFetch('/api/onboarding',{cache:'no-store'}).then(async response=>{if(!response.ok)return null;return await response.json() as OnboardingSnapshot}).then(value=>{if(alive&&value)setSnapshot(value)}).catch(()=>undefined);return()=>{alive=false}},[]);
 useEffect(()=>{const close=(event:MouseEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))setOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[]);
 const contexts=useMemo(()=>snapshot?.contexts.filter(context=>context.status==='active')||[],[snapshot]);
 const current=useMemo(()=>{if(typeof window==='undefined')return null;const path=window.location.pathname;const inferred=path.startsWith('/corporate')?contexts.find(c=>c.type==='corporate'):path.startsWith('/manage')?contexts.find(c=>c.type==='provider'):contexts.find(c=>c.type==='personal');return contexts.find(c=>c.type===snapshot?.profile.lastContextType&&c.id===snapshot?.profile.lastContextId)||inferred||contexts[0]||null},[contexts,snapshot]);
 if(!snapshot||snapshot.nextStep!=='ready'||contexts.length<2||!current)return null;
 async function choose(context:WorkspaceContext){if(context.id===current?.id&&context.type===current.type){setOpen(false);return}setBusy(true);setError('');try{const response=await sessionFetch('/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setLastContext',contextType:context.type,contextId:context.id})});const value=await response.json() as {error?:string};if(!response.ok)throw new Error(value.error||'Workspace is no longer available.');window.location.assign(target(context.type))}catch(reason){setError(reason instanceof Error?reason.message:'Workspace switch failed');setBusy(false)}}
 return <div className="ws-switcher" ref={ref} data-sessions-workspace-switcher><button className="ws-current" type="button" aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(value=>!value)}>{icon(current.type)}<span><small>Workspace</small><strong>{current.label}</strong></span><ChevronDown size={16}/></button>{open&&<div className="ws-menu" role="menu"><div className="ws-menu-head"><strong>Switch workspace</strong><small>Only contexts currently authorized by Sessions are shown.</small></div>{contexts.map(context=><button role="menuitem" key={`${context.type}:${context.id}`} disabled={busy} className={context.type===current.type&&context.id===current.id?'active':''} onClick={()=>void choose(context)}>{icon(context.type)}<span><strong>{context.label}</strong><small>{context.type==='personal'?'Personal marketplace':context.type==='provider'?'Studio organization':'Sessions company'}</small></span></button>)}{error&&<p role="alert">{error}</p>}</div>}</div>;
}
