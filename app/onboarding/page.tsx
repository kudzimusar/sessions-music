import {redirect} from 'next/navigation';
import OnboardingGateway from '@/app/onboarding-gateway';
import {getProductionUser} from '@/app/chatgpt-auth';
import {readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

export default async function Onboarding({searchParams}:{searchParams?:Promise<{return_to?:string}>}){
 const params=searchParams?await searchParams:{};const returnTo=safeInternalPath(params.return_to,'/mobile');
 const actor=await getProductionUser();if(!actor)redirect('/welcome?return_to='+encodeURIComponent(returnTo));
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);
 return <OnboardingGateway authenticated initialSnapshot={snapshot} returnTo={returnTo}/>;
}
