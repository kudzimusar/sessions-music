import {redirect} from 'next/navigation';
import CustomerV5 from './customer-v5';
import {getProductionUser} from './chatgpt-auth';
import {createContinuationIntent} from '@/lib/continuation';
import {hasWorkspaceContext,readOnboardingSnapshot} from '@/lib/onboarding-server';

export default async function Page(){
 const actor=await getProductionUser();
 if(!actor){const token=await createContinuationIntent('/','route');redirect('/welcome?continue='+encodeURIComponent(token))}
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);
 if(!snapshot||snapshot.nextStep!=='ready'||!hasWorkspaceContext(snapshot,'personal')){const token=await createContinuationIntent('/','route',actor.id);redirect('/onboarding?continue='+encodeURIComponent(token))}
 return <CustomerV5 path="/mobile"/>;
}
