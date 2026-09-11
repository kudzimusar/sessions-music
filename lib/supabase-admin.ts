import {env} from 'cloudflare:workers';
import type {PlatformRole} from './identity-core';

type RuntimeEnv={SESSIONS_IDENTITY_MODE?:string;SUPABASE_URL?:string;SUPABASE_SECRET_KEY?:string};

function config(){
 const values=env as unknown as RuntimeEnv;
 if(values.SESSIONS_IDENTITY_MODE!=='supabase')return null;
 const url=(values.SUPABASE_URL||'').trim().replace(/\/$/,'');const secret=(values.SUPABASE_SECRET_KEY||'').trim();
 if(!url||!secret)throw new Error('Supabase server provisioning is not configured. Add the secret key to the Site runtime before approving owners, staff or platform roles.');
 return {url,secret};
}

async function request<T>(path:string,init:RequestInit):Promise<T>{
 const value=config();if(!value)return null as T;
 const response=await fetch(value.url+path,{...init,headers:{apikey:value.secret,Authorization:`Bearer ${value.secret}`,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});
 if(!response.ok){const detail=(await response.text()).slice(0,500);throw new Error(`Supabase authority provisioning failed (${response.status})${detail?`: ${detail}`:''}`)}
 return response.status===204?null as T:response.json() as Promise<T>;
}

export async function provisionStudioMembership(input:{studioId:string;studioName:string;userId:string;role:'owner'|'manager'|'staff';grantedBy:string}){
 if(!config())return;
 let organizations=await request<Array<{id:string}>>(`/rest/v1/organizations?studio_id=eq.${encodeURIComponent(input.studioId)}&select=id`,{method:'GET'});
 if(!organizations.length)organizations=await request<Array<{id:string}>>('/rest/v1/organizations',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({studio_id:input.studioId,name:input.studioName,status:'active',created_by:input.userId})});
 const organizationId=organizations[0]?.id;if(!organizationId)throw new Error('Supabase did not return the studio organization after provisioning.');
 await request('/rest/v1/organization_memberships?on_conflict=organization_id,user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({organization_id:organizationId,user_id:input.userId,role:input.role,active:true,granted_by:input.grantedBy,revoked_at:null})});
}

export async function setPlatformRole(input:{userId:string;role:PlatformRole;enabled:boolean;grantedBy:string}){
 if(!config())throw new Error('Production identity role provisioning is not configured.');
 if(input.role==='musician')throw new Error('The base customer role is lifecycle-managed by identity sync.');
 const filter=`user_id=eq.${encodeURIComponent(input.userId)}&role=eq.${encodeURIComponent(input.role)}`;
 if(input.enabled){
  await request('/rest/v1/platform_role_assignments?on_conflict=user_id,role',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:input.userId,role:input.role,granted_by:input.grantedBy,granted_at:new Date().toISOString(),revoked_at:null})});
  return;
 }
 await request(`/rest/v1/platform_role_assignments?${filter}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({revoked_at:new Date().toISOString()})});
}
