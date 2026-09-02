import SessionsApp from '../sessions';
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;return <SessionsApp initialPath={'/'+slug.join('/')}/>}
