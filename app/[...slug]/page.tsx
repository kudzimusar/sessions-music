import SessionsApp from '../sessions';
import RegistryApp from '../registry';
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const path='/'+slug.join('/');return ['studios','studio','map','mobile','manage','requests','account','registry-admin','planner','register','onboarding','subscriptions'].includes(slug[0])?<RegistryApp path={path}/>:<SessionsApp initialPath={path}/>;}
