const SAFE_ROOTS=new Set(['home','search','sessions','profile','planner','provider','security','diagnostics','studio','booking','onboarding']);

export function sanitizeNativeContinuation(value){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('://')||value.includes('\\'))return '/home';
  let url;
  try{url=new URL(value,'https://sessions.invalid')}catch{return '/home'}
  if(url.origin!=='https://sessions.invalid')return '/home';
  const first=url.pathname.split('/').filter(Boolean)[0]||'home';
  if(!SAFE_ROOTS.has(first))return '/home';
  return `${url.pathname}${url.search}${url.hash}`;
}
