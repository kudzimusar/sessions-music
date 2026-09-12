import {redirect} from 'next/navigation';
import OnboardingGateway from '@/app/onboarding-gateway';
import {getProductionUser} from '@/app/chatgpt-auth';
import {resolveContinuationIntent} from '@/lib/continuation';
import {readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

export default async function Onboarding({searchParams}:{searchParams?:Promise<{return_to?:string;continue?:string}>}){
 const params=searchParams?await searchParams:{};const actor=await getProductionUser();
 if(!actor){const authTarget=params.continue?`/welcome?continue=${encodeURIComponent(params.continue)}`:`/welcome?return_to=${encodeURIComponent(safeInternalPath(params.return_to,'/mobile'))}`;redirect(authTarget)}
 const continuation=params.continue?await resolveContinuationIntent(params.continue,actor.id).catch(()=>null):null;
 const returnTo=continuation?.returnPath||safeInternalPath(params.return_to,'/mobile');
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);
 return <OnboardingGateway authenticated initialSnapshot={snapshot} returnTo={returnTo} continuationToken={continuation?params.continue||null:null}/>;
}
