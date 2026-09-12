'use client';
import {useEffect,useState} from 'react';
import {Activity,BarChart3,BookOpenCheck,RefreshCw,ShieldCheck,UsersRound} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {sessionFetch} from '@/lib/supabase-browser';
import {moduleForId,type CorporateReadModule} from '@/lib/corporate-control-plane';

type Metric={label:string;value:string|number;detail?:string};
type Data={module:CorporateReadModule;title:string;description:string;generatedAt:string;metrics:Metric[];columns:string[];rows:Array<Array<string|number>>;note:string;error?:string};
const icons={bookings:BookOpenCheck,customers:UsersRound,memberships:UsersRound,incidents:Activity,analytics:BarChart3,audit:ShieldCheck} as const;

export default function CorporateControlPlane({module}:{module:CorporateReadModule}){
 const[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const response=await sessionFetch(`/api/corporate/control-plane?module=${encodeURIComponent(module)}`,{cache:'no-store'});const value=await response.json() as Data;if(!response.ok)throw new Error(value.error||'Corporate module unavailable');setData(value)}catch(e){setError(e instanceof Error?e.message:'Corporate module unavailable')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[module]);const definition=moduleForId(module),Icon=icons[module];
 if(loading)return <section className="r-width r-inner"><div className="r-loading">Loading {definition?.shortTitle.toLowerCase()||'corporate module'}…</div></section>;
 if(error)return <section className="r-width r-inner"><div className="r-panel"><h1>Module unavailable</h1><p>{error}</p><Button onClick={()=>void load()}><RefreshCw size={16}/>Retry</Button></div></section>;
 if(!data)return null;
 return <section className="r-width r-inner c4-module">
  <div className="r-workspace-heading"><div><div className="r-eyebrow"><Icon size={16}/>SESSIONS CORPORATE CONTROL PLANE</div><h1>{data.title}</h1><p className="r-intro">{data.description}</p></div><div className="r-panel c4-source-card"><strong>Canonical projection</strong><p>This screen reads the existing marketplace source of truth. It does not create a corporate copy of the domain.</p></div></div>
  <div className="r-metrics c4-metrics">{data.metrics.map(item=><div key={item.label}><span>{item.label}</span><strong>{item.value}</strong>{item.detail?<small>{item.detail}</small>:<Icon/>}</div>)}</div>
  {data.columns.length>0?<section className="r-panel c4-data-panel"><div className="c4-section-heading"><div><h2>Current records</h2><p className="r-small">Privacy-minimized, permission-scoped operational projection.</p></div><Button variant="outline" onClick={()=>void load()}><RefreshCw size={16}/>Refresh</Button></div>{data.rows.length===0?<p className="r-muted">No records are currently visible in this module.</p>:<div className="r-table-wrap"><table className="r-table c4-table"><thead><tr>{data.columns.map(column=><th key={column}>{column}</th>)}</tr></thead><tbody>{data.rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex} data-label={data.columns[cellIndex]}>{String(cell)}</td>)}</tr>)}</tbody></table></div>}</section>:<section className="r-panel c4-data-panel"><h2>Aggregate operational snapshot</h2><p>The detailed event/warehouse analytics layer is intentionally not simulated before its implementation phase.</p></section>}
  <div className="r-panel c4-boundary"><ShieldCheck size={20}/><div><strong>Phase boundary</strong><p>{data.note}</p></div></div>
  <p className="r-muted">Generated {new Date(data.generatedAt).toLocaleString()}. Refresh to re-read canonical operational state.</p>
 </section>;
}
