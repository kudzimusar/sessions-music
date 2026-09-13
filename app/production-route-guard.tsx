'use client';
import {useEffect} from 'react';

const aliases:Record<string,string>={
 '/provider':'/manage',
 '/admin':'/corporate',
 '/bookings':'/requests',
 '/profile':'/account',
};

function productionTarget(value:string|URL|null|undefined){
 if(value===null||value===undefined)return null;
 try{const url=new URL(String(value),window.location.origin);return url.origin===window.location.origin?aliases[url.pathname]||null:null}catch{return null}
}

export default function ProductionRouteGuard(){
 useEffect(()=>{
  // `/mobile` is now its own native interaction tree. Retire the old registry
  // session flag so the desktop/PWA cannot inherit a stale "phone mode".
  try{sessionStorage.removeItem('sessions-phone-view')}catch{}
  const history=window.history;
  const push=history.pushState.bind(history),replace=history.replaceState.bind(history);
  history.pushState=((data:unknown,unused:string,url?:string|URL|null)=>{const target=productionTarget(url);if(target){window.location.assign(target);return}return push(data,unused,url)}) as History['pushState'];
  history.replaceState=((data:unknown,unused:string,url?:string|URL|null)=>{const target=productionTarget(url);if(target){window.location.replace(target);return}return replace(data,unused,url)}) as History['replaceState'];
  return()=>{history.pushState=push as History['pushState'];history.replaceState=replace as History['replaceState']};
 },[]);
 return null;
}
