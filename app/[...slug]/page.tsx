import SessionsApp from '../sessions-v2';
import RegistryApp from '../registry';
import CustomerV5 from '../customer-v5';
import CorporateWorkspace from '../corporate-workspace';
import CorporateOffice from '../corporate-office';
import CorporateOrganization from '../corporate-organization';
import CorporateAccessReviews from '../corporate-access-reviews';
import CorporateControlPlane from '../corporate-control-plane';
import CorporateBookingOps from '../corporate-booking-ops';
import CorporateCases from '../corporate-cases';
import AccessBoundary from '../access-boundary';
import type {Metadata} from 'next';
import {readPublicStudio} from '@/db/public-studio';
import {isCorporateReadModule,moduleForId} from '@/lib/corporate-control-plane';
import {env} from 'cloudflare:workers';
import {notFound,redirect} from 'next/navigation';
import {getChatGPTUser,getProductionUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
import {createContinuationIntent} from '@/lib/continuation';
import {hasWorkspaceContext,readOnboardingSnapshot} from '@/lib/onboarding-server';
type Props={params:Promise<{slug:string[]}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;if(slug[0]!=='studio'||slug.length!==2)return {};
 const actor=await getProductionUser();if(!actor)return {title:'Sessions',description:'Sign in to Sessions to view music spaces and manage your bookings.',robots:{index:false,follow:false}};
 const studio=await readPublicStudio(slug[1]);const title=studio?studio.name+' | Sessions':'Studio unavailable | Sessions';const description=studio?studio.description:'This studio profile is unavailable.';
 return {title,description,openGraph:{title,description,images:[]},twitter:{card:'summary',title,description,images:[]},robots:{index:false,follow:false}};
}
const corporateSurface=(children:React.ReactNode)=><div data-sessions-surface="corporate">{children}</div>;
async function sendToOnboarding(path:string,userId?:string|null,entry:'welcome'|'onboarding'='onboarding'):Promise<never>{const token=await createContinuationIntent(path,'route',userId||null);redirect(`/${entry}?continue=${encodeURIComponent(token)}`)}
export default async function Page({params}:Props){
 const {slug}=await params;const path='/'+slug.join('/');
 if(path==='/provider')redirect('/manage');if(path==='/admin')redirect('/corporate');if(path==='/bookings')redirect('/requests');if(path==='/profile')redirect('/account');
 const sandboxSurface=['demo','saved','space','booking'].includes(slug[0]);
 if(sandboxSurface&&(env as unknown as {SESSIONS_IDENTITY_MODE?:string}).SESSIONS_IDENTITY_MODE==='supabase'){
  const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath(path));
  const allowed=((env as unknown as {SESSIONS_DEMO_OWNER_EMAILS?:string}).SESSIONS_DEMO_OWNER_EMAILS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);if(!allowed.includes(user.email.toLowerCase()))notFound();
 }
 const actor=await getProductionUser();if(!actor)return sendToOnboarding(path,null,'welcome');
 const snapshot=await readOnboardingSnapshot(actor).catch(()=>null);if(!snapshot||['profile','consent','workspace','restricted'].includes(snapshot.nextStep))return sendToOnboarding(path,actor.id);
 const corporatePath=slug[0]==='corporate'||slug[0]==='registry-admin';
 if(corporatePath&&!hasWorkspaceContext(snapshot,'corporate'))return sendToOnboarding(path,actor.id);
 if(path==='/manage'&&!hasWorkspaceContext(snapshot,'provider'))return sendToOnboarding(path,actor.id);
 const customerPath=!corporatePath&&path!=='/manage'&&!sandboxSurface&&path!=='/account';
 if(customerPath&&!hasWorkspaceContext(snapshot,'personal'))return sendToOnboarding(path,actor.id);
 if(slug[0]==='studio'&&slug.length===2)return <RegistryApp path={path} initialStudio={await readPublicStudio(slug[1])}/>;
 if(path==='/mobile')return <CustomerV5 path="/mobile"/>;
 if(path==='/account')return <CustomerV5 path="/account"/>;
 if(slug[0]==='corporate'){
  if(slug.length===1)return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate"><CorporateWorkspace/></AccessBoundary>);
  if(slug.length!==2)notFound();
  if(slug[1]==='organization')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/organization" requiredPermissions={['organization:read']}><CorporateOrganization/></AccessBoundary>);
  if(slug[1]==='access')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/access" requiredPermissions={['security:read']}><CorporateAccessReviews/></AccessBoundary>);
  if(slug[1]==='bookings')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/bookings" requiredPermissions={['bookings:read']}><CorporateBookingOps/></AccessBoundary>);
  if(slug[1]==='incidents')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/incidents" requiredPermissions={['cases:read']}><CorporateCases/></AccessBoundary>);
  if(isCorporateReadModule(slug[1])){const module=moduleForId(slug[1]);if(!module)notFound();return corporateSurface(<AccessBoundary surface="corporate" returnTo={module.href} requiredPermissions={[...module.requiredPermissions]}><CorporateControlPlane module={slug[1]}/></AccessBoundary>)}
  if(slug[1]==='trust')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/trust" requiredPermissions={['claims:review','verification:review']}><CorporateOffice office="trust"/></AccessBoundary>);
  if(slug[1]==='finance')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/finance" requiredPermissions={['settlements:review']}><CorporateOffice office="finance"/></AccessBoundary>);
  if(slug[1]==='support')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/support" requiredPermissions={['support:read']}><CorporateOffice office="support"/></AccessBoundary>);
  if(slug[1]==='providers')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/corporate/providers" requiredPermissions={['providers:oversight']}><CorporateOffice office="providers"/></AccessBoundary>);
  notFound();
 }
 if(slug[0]==='registry-admin')return corporateSurface(<AccessBoundary surface="corporate" returnTo="/registry-admin" requiredPermissions={['claims:review','settlements:review','support:read','providers:oversight']}><RegistryApp path={path}/></AccessBoundary>);
 return ['studios','studio','map','manage','requests','inbox','notifications','planner','register','onboarding','subscriptions'].includes(slug[0])?<RegistryApp path={path}/>:<SessionsApp initialPath={path}/>;
}
