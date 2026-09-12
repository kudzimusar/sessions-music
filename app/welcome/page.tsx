import OnboardingGateway from '@/app/onboarding-gateway';
import {getProductionUser} from '@/app/chatgpt-auth';
import {readOnboardingSnapshot,safeInternalPath} from '@/lib/onboarding-server';

export default async function Welcome({searchParams}:{searchParams?:Promise<{return_to?:string}>}){
 const params=searchParams?await searchParams:{};const returnTo=safeInternalPath(params.return_to,'/mobile');
 const actor=await getProductionUser();
 const snapshot=actor?await readOnboardingSnapshot(actor).catch(()=>null):null;
 return <OnboardingGateway authenticated={!!actor} initialSnapshot={snapshot} returnTo={returnTo}/>;
}
