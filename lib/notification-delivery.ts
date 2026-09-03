import {env} from 'cloudflare:workers';

type Runtime=Record<string,string|undefined>;
const runtime=()=>env as unknown as Runtime;

export function emailConfiguration(){
 const c=runtime();const enabled=c.EMAIL_PROVIDER_ENABLED==='true';
 return {enabled,ready:enabled&&!!c.EMAIL_PROVIDER_ENDPOINT&&!!c.EMAIL_PROVIDER_TOKEN&&!!c.EMAIL_FROM};
}

/**
 * Generic HTTP adapter for a vetted mail relay. It cannot run until the explicit
 * feature gate and all relay credentials are present; callers must have stored consent.
 */
export async function deliverEmail(input:{idempotencyKey:string;to:string;subject:string;text:string}){
 const c=runtime(),config=emailConfiguration();if(!config.ready)return {status:'not_configured' as const};
 const response=await fetch(c.EMAIL_PROVIDER_ENDPOINT||'',{method:'POST',signal:AbortSignal.timeout(20_000),headers:{Authorization:`Bearer ${c.EMAIL_PROVIDER_TOKEN}`,'Content-Type':'application/json','Idempotency-Key':input.idempotencyKey},body:JSON.stringify({from:c.EMAIL_FROM,to:input.to,subject:input.subject,text:input.text})});
 if(!response.ok)throw new Error(`Email relay returned ${response.status}`);
 return {status:'sent' as const};
}
