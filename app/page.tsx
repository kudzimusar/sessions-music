import {redirect} from 'next/navigation';
import CustomerV5 from './customer-v5';
import {getProductionUser} from './chatgpt-auth';
import {readOnboardingSnapshot} from '@/lib/onboarding-server';

export default async function Page(){
 const actor=await getProductionUser();if(!actor)redirect('/welcome?return_to=%2F');
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);
 if(!snapshot||snapshot.nextStep!=='ready')redirect('/onboarding?return_to=%2F');
 return <CustomerV5 path="/mobile"/>;
}
