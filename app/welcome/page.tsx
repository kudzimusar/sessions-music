import {redirect} from 'next/navigation';
import OnboardingGateway from '@/app/onboarding-gateway';
import {getProductionUser} from '@/app/chatgpt-auth';
import {consumeContinuationIntent,resolveContinuationIntent} from '@/lib/continuation';
import {readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

const defaultContextPath=(type:string)=>type==='corporate'?'/corporate':type==='provider'?'/manage':'/mobile';
export default async function Welcome({searchParams}:{searchParams?:Promise<{return_to?:string;continue?:string;choose?:string}>}){
 const params=searchParams?await searchParams:{};const actor=await getProductionUser();
 const continuation=params.continue?await resolveContinuationIntent(params.continue,actor?.id||null).catch(()=>null):null;
 const returnTo=continuation?.returnPath||safeInternalPath(params.return_to,'/mobile');
 const snapshot=actor?await readOnboardingSnapshot(actor).catch(()=>null):null;
 if(actor&&snapshot&&snapshot.nextStep==='ready'&&params.choose!=='1'){
  const preferred=snapshot.contexts.find(context=>context.type===snapshot.profile.lastContextType&&context.id===snapshot.profile.lastContextId&&context.status==='active')||(snapshot.contexts.length===1?snapshot.contexts[0]:null);
  if(preferred){const target=continuation?.returnPath||defaultContextPath(preferred.type);if(params.continue&&continuation)await consumeContinuationIntent(params.continue,actor.id);redirect(target)}
 }
 return <OnboardingGateway authenticated={!!actor} initialSnapshot={snapshot} returnTo={returnTo} continuationToken={continuation?params.continue||null:null}/>;
}
