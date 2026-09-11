import SessionsApp from '../sessions-v2';
import RegistryApp from '../registry';
import CorporateWorkspace from '../corporate-workspace';
import AccessBoundary from '../access-boundary';
import type {Metadata} from 'next';
import {readPublicStudio} from '@/db/public-studio';
import {env} from 'cloudflare:workers';
import {notFound,redirect} from 'next/navigation';
import {getChatGPTUser,chatGPTSignInPath} from '@/app/chatgpt-auth';
type Props={params:Promise<{slug:string[]}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {slug}=await params;if(slug[0]!=='studio'||slug.length!==2)return {};
 const studio=await readPublicStudio(slug[1]);
 const title=studio?studio.name+' | Sessions':'Studio unavailable | Sessions';
 const description=studio?studio.description:'This studio profile is unavailable. Browse the Sessions Harare directory.';
 return {title,description,openGraph:{title,description,images:[]},twitter:{card:'summary',title,description,images:[]},...(studio?{}:{robots:{index:false,follow:false}})};
}
export default async function Page({params}:Props){
 const {slug}=await params;const path='/'+slug.join('/');
 // Legacy marketplace URLs now resolve into the same production registry/account/authority domain.
 if(path==='/provider')redirect('/manage');
 if(path==='/admin')redirect('/corporate');
 if(path==='/bookings')redirect('/requests');
 if(path==='/profile')redirect('/account');

 // The sample booking sandbox remains deliberately separate and owner-only once production identity is enabled.
 const sandboxSurface=['demo','saved','space','booking'].includes(slug[0]);
 if(sandboxSurface&&(env as unknown as {SESSIONS_IDENTITY_MODE?:string}).SESSIONS_IDENTITY_MODE==='supabase'){
  const user=await getChatGPTUser();if(!user)redirect(chatGPTSignInPath(path));
  const allowed=((env as unknown as {SESSIONS_DEMO_OWNER_EMAILS?:string}).SESSIONS_DEMO_OWNER_EMAILS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
  if(!allowed.includes(user.email.toLowerCase()))notFound();
 }
 if(slug[0]==='studio'&&slug.length===2)return <RegistryApp path={path} initialStudio={await readPublicStudio(slug[1])}/>;
 if(slug[0]==='corporate')return <AccessBoundary surface="corporate"><CorporateWorkspace/></AccessBoundary>;
 if(slug[0]==='registry-admin')return <AccessBoundary surface="corporate"><RegistryApp path={path}/></AccessBoundary>;
 return ['studios','studio','map','mobile','manage','requests','inbox','notifications','account','planner','register','onboarding','subscriptions'].includes(slug[0])?<RegistryApp path={path}/>:<SessionsApp initialPath={path}/>;
}
