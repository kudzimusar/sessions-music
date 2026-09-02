'use client';
import {useEffect,useRef,useState} from 'react';
import {LocateFixed,Sparkles,Users,MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Field,Choice,CheckField} from './registry-ui';
import {studioPin,type Studio} from '@/lib/registry';
import {type DiscoverySettings} from '@/lib/discovery';
export {defaultDiscovery,refineDiscovery,type DiscoverySettings} from '@/lib/discovery';

export default function DiscoveryTools({value,onChange,studios}:{value:DiscoverySettings;onChange:(s:DiscoverySettings)=>void;studios:Studio[]}){
 const [locating,setLocating]=useState(false),[message,setMessage]=useState('');
 const latest=useRef(value);
 useEffect(()=>{latest.current=value},[value]);
 const locate=()=>{
  if(!navigator.geolocation){setMessage('Location is unavailable in this browser. Choose a neighbourhood above.');return;}
  setLocating(true);setMessage('');
  navigator.geolocation.getCurrentPosition(p=>{
   onChange({...latest.current,position:{lat:p.coords.latitude,lng:p.coords.longitude}});
   setMessage((p.coords.accuracy>1000?'Your device location is approximate. ':'')+'Your location stays on this page; it is not saved or sent to our server.');setLocating(false);
  },e=>{setMessage(e.code===1?'Location permission was not granted. You can still search by neighbourhood.':'Could not locate you. Try again or choose a neighbourhood.');setLocating(false)},
  {enableHighAccuracy:false,timeout:10000,maximumAge:60000});
 };
 const publicCount=studios.filter(s=>studioPin(s)?.approximate).length;
 const unknown=studios.filter(s=>!studioPin(s)).length;
 return <div className="x-discovery-tools">
  <div className="x-quick-actions"><Button variant="outline" disabled={locating} onClick={locate}><LocateFixed size={17}/>{locating?'Finding your location…':'Find a studio near me'}</Button><a href="/planner" className="x-planner-link"><Sparkles size={18}/><span>Plan my session<small>Budget, group size & available times</small></span></a></div>
  <div className="x-filter-fields">
   <Field label="People"><input aria-label="Minimum room capacity" type="number" min="1" max="200" placeholder="Any size" value={value.size} onChange={e=>onChange({...value,size:e.target.value})}/></Field>
   <Field label="Session budget · USD"><input type="number" min="1" step="1" placeholder="Any budget" value={value.budget} onChange={e=>onChange({...value,budget:e.target.value})}/></Field>
   <Choice label="Session length" value={String(value.duration)} onChange={v=>onChange({...value,duration:Number(v)})} options={[30,60,90,120,180,240,480].map(n=>({value:String(n),label:n+' minutes'}))}/>
   {value.position&&<Choice label="Distance radius" value={String(value.radius)} onChange={v=>onChange({...value,radius:Number(v)})} options={[5,10,25,50,100].map(n=>({value:String(n),label:'Within '+n+' km'}))}/>}
  </div>
  {message&&<p className="r-small" role="status">{message}</p>}
  {value.position&&<div className="r-notice"><MapPin size={18}/><div>
   <strong>Nearest locations first · straight-line distances</strong>
   <p>{publicCount} profiles have approximate public-source locations, not confirmed entrances. {unknown} have no researched coordinates and cannot be included in a distance search. Road distances may differ.</p>
   <CheckField checked={value.includeApproximate} onChange={includeApproximate=>onChange({...value,includeApproximate})}>Include clearly labelled approximate building, campus and street locations</CheckField>
   <div className="r-button-row"><Button variant="outline" onClick={()=>{onChange({...value,position:null});setMessage('Location cleared.')}}>Clear distance filter</Button><a className="r-link" href="https://www.google.com/maps/search/recording+rehearsal+studios+near+me/" target="_blank" rel="noreferrer">Search nearby in Google Maps</a></div>
  </div></div>}
  {(value.size||value.budget)&&<p className="r-small"><Users size={13}/> Unknown capacities or prices cannot be confirmed matches. Budget is for the full session; final availability and membership validity are checked at booking.</p>}
 </div>;
}
