'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {launchReadiness,type LaunchConfiguration} from '@/lib/readiness';
import type {RegistryState} from '@/lib/registry';

export default function LaunchReadiness({data}:{data:RegistryState}){
 const [configuration,setConfiguration]=useState<LaunchConfiguration>({ai:null,gateways:null});
 const [revision,setRevision]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;setLoading(true);setError('');
  const read=async(path:string)=>{const r=await fetch(path);if(!r.ok)throw new Error('Status unavailable');return r.json()};
  void Promise.allSettled([read('/api/planner'),read('/api/billing')]).then(([ai,billing])=>{
   if(!active)return;
   setConfiguration({ai:ai.status==='fulfilled'?!!ai.value.aiReady:null,gateways:billing.status==='fulfilled'?billing.value.providers:null,mode:billing.status==='fulfilled'?billing.value.mode:undefined});
   if(ai.status==='rejected'||billing.status==='rejected')setError('Some integration checks failed. Unknown status is not evidence that a service is connected.');
   setLoading(false);
  });return()=>{active=false};
 },[revision]);
 return <section className="x-launch-readiness">
  <div className="r-section-top"><div><h2>The eight launch requirements</h2><p>Current registry coverage and configuration—not a claim that every feature is complete.</p></div><Button variant="outline" disabled={loading} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={15}/>{loading?'Checking…':'Refresh integration status'}</Button></div>
  {error&&<p className="r-error" role="alert">{error}</p>}
  <div className="x-readiness-grid">{launchReadiness(data.studios,configuration).map((item,i)=><article className="r-panel" key={item.title}><span className="r-small">REQUIREMENT {i+1}</span><h3>{item.title}</h3><p className="x-readiness-status">{item.status}</p><p>{item.detail}</p><a className="r-link" href={item.href}>Open feature<ArrowUpRight size={15}/></a></article>)}</div>
  {configuration.gateways&&<div className="r-panel"><h3>Payment configuration</h3><ul>{configuration.gateways.map(p=><li key={p.name}>{p.name}: {p.ready?'configured — provider verification still required':'not activated'}</li>)}</ul><p className="r-small">This check reads readiness flags only. It does not send an AI prompt, create a subscription, contact a studio or charge anyone.</p></div>}
 </section>;
}
