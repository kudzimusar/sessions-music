'use client';
import {useEffect,useState} from 'react';
import {Building2,CheckCircle2,Headphones,Landmark,ReceiptText,RefreshCw,ShieldCheck,UserCog,Users} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {sessionFetch} from '@/lib/supabase-browser';

type Overview={
 roles:string[];permissions:string[];generatedAt:string;
 marketplace?:{studios:number;bookable:number;pendingClaims:number;pendingVerifications:number};
 providers?:{pendingRegistrations:number;activeStaff:number};
 finance?:{disputed:number;awaitingPayment:number;invoices:number};
 support?:{openRegistryIssues:number;failedNotifications:number};
 error?:string;
};

type Office={permission:string;title:string;copy:string;icon:typeof ShieldCheck;href:string};
const offices:Office[]=[
 {permission:'claims:review',title:'Trust & safety',copy:'Ownership claims, studio verification and marketplace integrity.',icon:ShieldCheck,href:'/corporate/trust'},
 {permission:'settlements:review',title:'Finance',copy:'Settlement exceptions, invoices, fee governance and reconciliation.',icon:ReceiptText,href:'/corporate/finance'},
 {permission:'support:read',title:'Customer support',copy:'Customer-facing issues and operational service health without private message access.',icon:Headphones,href:'/corporate/support'},
 {permission:'providers:oversight',title:'Provider operations',copy:'Provider onboarding, registrations and marketplace readiness.',icon:Building2,href:'/corporate/providers'},
 {permission:'platform:roles.manage',title:'Super administration',copy:'Platform authority and office-role assignment. No provider or customer can self-promote.',icon:UserCog,href:'#role-control'},
];

export default function CorporateWorkspace(){
 const[data,setData]=useState<Overview|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const response=await sessionFetch('/api/corporate/overview',{cache:'no-store'});const value=await response.json() as Overview;if(!response.ok)throw new Error(value.error||'Corporate overview unavailable');setData(value)}catch(e){setError(e instanceof Error?e.message:'Corporate overview unavailable')}finally{setLoading(false)}};
 useEffect(()=>{void load()},[]);
 if(loading)return <section className="r-width r-inner"><div className="r-loading">Loading corporate authority…</div></section>;
 if(error)return <section className="r-width r-inner"><div className="r-panel"><h1>Corporate console unavailable</h1><p>{error}</p><Button onClick={()=>void load()}><RefreshCw size={16}/>Retry</Button></div></section>;
 const permissions=new Set(data?.permissions||[]),roles=data?.roles||[];
 const canOpenOperations=permissions.has('claims:review')&&permissions.has('settlements:review')&&permissions.has('support:read')&&permissions.has('providers:oversight');
 return <section className="r-width r-inner">
  <div className="r-workspace-heading"><div><div className="r-eyebrow"><Landmark size={16}/>SESSIONS CORPORATE</div><h1>Platform control centre.</h1><p className="r-intro">One authority plane for the marketplace. Each office sees only the responsibilities assigned to its account.</p></div><div className="r-panel"><strong>Signed-in authority</strong><p>{roles.map(role=>role.replaceAll('_',' ')).join(' · ')||'No corporate role'}</p></div></div>
  <div className="r-trust-row"><span><ShieldCheck/>Deny by default</span><span><Users/>Tenant-scoped providers</span><span><CheckCircle2/>Server-enforced roles</span></div>
  {data?.marketplace&&<div className="r-metrics"><div><span>Marketplace studios</span><strong>{data.marketplace.studios}</strong><Building2/></div><div><span>Bookable studios</span><strong>{data.marketplace.bookable}</strong><CheckCircle2/></div><div><span>Pending claims</span><strong>{data.marketplace.pendingClaims}</strong><ShieldCheck/></div><div><span>Verification queue</span><strong>{data.marketplace.pendingVerifications}</strong><ShieldCheck/></div></div>}
  <h2>Corporate offices</h2><div className="r-studio-grid">{offices.map(({permission,title,copy,icon:Icon,href})=>{const allowed=permissions.has(permission);return <article className="r-panel" key={permission}><Icon size={25}/><span className={'r-badge '+(allowed?'claimed':'')}>{allowed?'Assigned':'Not assigned'}</span><h3>{title}</h3><p>{copy}</p>{allowed?<a className="r-primary" href={href}>Open {title}</a>:<p className="r-small">This account cannot open this office.</p>}</article>})}</div>
  {canOpenOperations&&<section className="r-panel"><div className="r-eyebrow"><Landmark size={16}/>CROSS-MARKETPLACE OPERATIONS</div><h2>General Operations console</h2><p>This account has the combined Trust, Finance, Support and Provider Operations authority required for cross-marketplace incident handling.</p><a className="r-primary" href="/registry-admin">Open Operations console</a></section>}
  <div className="r-metrics">{data?.providers&&<><div><span>Provider registrations</span><strong>{data.providers.pendingRegistrations}</strong><Building2/></div><div><span>Active provider staff</span><strong>{data.providers.activeStaff}</strong><Users/></div></>}{data?.finance&&<><div><span>Settlement disputes</span><strong>{data.finance.disputed}</strong><ReceiptText/></div><div><span>Payment records needing attention</span><strong>{data.finance.awaitingPayment}</strong><ReceiptText/></div></>}{data?.support&&<><div><span>Open registry issues</span><strong>{data.support.openRegistryIssues}</strong><Headphones/></div><div><span>Failed notifications</span><strong>{data.support.failedNotifications}</strong><Headphones/></div></>}</div>
  {permissions.has('platform:roles.manage')&&<section className="r-panel" id="role-control"><div className="r-eyebrow"><UserCog size={16}/>SUPER ADMINISTRATION</div><h2>Assign platform authority</h2><p>Use the authenticated Supabase user UUID. This endpoint cannot be used by corporate administrators, Operations, Finance, Support, Trust & Safety, providers or customers.</p><form className="r-form" onSubmit={async event=>{event.preventDefault();setBusy(true);setMessage('');const form=new FormData(event.currentTarget);try{const response=await sessionFetch('/api/corporate/roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:form.get('userId'),role:form.get('role'),enabled:form.get('action')==='grant'})});const value=await response.json();if(!response.ok)throw new Error(value.error||'Role update failed');setMessage(`${String(form.get('role')).replaceAll('_',' ')} ${form.get('action')==='grant'?'granted':'revoked'}.`)}catch(e){setMessage(e instanceof Error?e.message:'Role update failed')}finally{setBusy(false)}}}><label className="r-field"><span>Target user UUID</span><input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="00000000-0000-0000-0000-000000000000"/></label><label className="r-field"><span>Platform role</span><select name="role" defaultValue="support_agent"><option value="support_agent">Customer support</option><option value="trust_safety">Trust & safety</option><option value="finance_admin">Finance administrator</option><option value="operations_admin">Marketplace operations</option><option value="corporate_admin">Corporate administrator</option><option value="super_admin">Super administrator</option><option value="provider_owner">Provider owner</option><option value="provider_manager">Provider manager</option><option value="provider_staff">Provider staff</option></select></label><label className="r-field"><span>Action</span><select name="action" defaultValue="grant"><option value="grant">Grant role</option><option value="revoke">Revoke role</option></select></label><Button disabled={busy}>{busy?'Updating authority…':'Apply authority change'}</Button>{message&&<p role="status">{message}</p>}</form></section>}
  <p className="r-muted">Generated {data?.generatedAt?new Date(data.generatedAt).toLocaleString():'now'}. Sensitive customer–studio messages are not included in this overview.</p>
 </section>;
}
