import {env} from 'cloudflare:workers';
import {platformRoles,type IdentityMethod,type IdentityPrincipal,type OrganizationMembership,type PlatformRole,type PlatformScopeType,type ScopedPlatformRole} from './identity-core';

type SupabaseRuntimeEnv={SUPABASE_URL?:string;SUPABASE_PUBLISHABLE_KEY?:string};
type AuthUser={id?:unknown;email?:unknown;phone?:unknown;app_metadata?:{provider?:unknown;providers?:unknown}};
type IdentityContext={user_id?:unknown;display_name?:unknown;session_id?:unknown;session_registered?:unknown;session_revoked?:unknown;roles?:unknown;scoped_roles?:unknown;memberships?:unknown;verified_phone?:unknown;verified_email?:unknown};
type TokenClaims={exp?:unknown;aal?:unknown};
export type AuthenticationAssuranceLevel='aal1'|'aal2'|null;
export type SupabaseIdentityPrincipal=IdentityPrincipal&{displayName:string;assuranceLevel:AuthenticationAssuranceLevel;deviceRegistered:boolean};

function runtimeConfig(){
 const values=env as unknown as SupabaseRuntimeEnv;const url=(values.SUPABASE_URL||'').trim().replace(/\/$/,'');const publishableKey=(values.SUPABASE_PUBLISHABLE_KEY||'').trim();
 if(!url||!publishableKey)throw new Error('Supabase identity is enabled but its runtime URL or publishable key is missing.');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))throw new Error('Supabase identity URL is invalid.');return {url,publishableKey};
}
function bearer(headers:Headers){const value=headers.get('authorization')||'';const match=/^Bearer\s+([^\s]+)$/i.exec(value);return !match||match[1].length>8192?null:match[1]}
function tokenClaims(token:string):TokenClaims{try{const payload=token.split('.')[1];if(!payload)return {};const base64=payload.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(payload.length/4)*4,'=');const decoded=JSON.parse(atob(base64));return decoded&&typeof decoded==='object'?decoded as TokenClaims:{}}catch{return {}}}
function tokenExpiry(claims:TokenClaims){return typeof claims.exp==='number'?claims.exp*1000:0}
function assuranceLevel(claims:TokenClaims):AuthenticationAssuranceLevel{return claims.aal==='aal2'?'aal2':claims.aal==='aal1'?'aal1':null}
function methodFor(user:AuthUser):IdentityMethod{const provider=typeof user.app_metadata?.provider==='string'?user.app_metadata.provider:'';if(provider==='phone')return 'phone_otp';if(provider==='google')return 'google';if(provider==='apple')return 'apple';return 'email_otp'}
function stringOrNull(value:unknown){return typeof value==='string'&&value.trim()?value.trim():null}
function rolesFrom(value:unknown):PlatformRole[]{if(!Array.isArray(value))return [];const allowed=new Set<PlatformRole>(platformRoles);return [...new Set(value.filter((role):role is PlatformRole=>typeof role==='string'&&allowed.has(role as PlatformRole)))]}
function scopedRolesFrom(value:unknown):ScopedPlatformRole[]{
 if(!Array.isArray(value))return [];const allowedRoles=new Set<PlatformRole>(platformRoles);const allowedScopes=new Set<PlatformScopeType>(['organization','department','provider','region','case','team']);
 const dedupe=new Set<string>();const result:ScopedPlatformRole[]=[];
 for(const item of value){if(!item||typeof item!=='object')continue;const row=item as Record<string,unknown>;const role=stringOrNull(row.role) as PlatformRole|null;const scopeType=stringOrNull(row.scope_type) as PlatformScopeType|null;const scopeId=stringOrNull(row.scope_id);if(!role||!scopeType||!scopeId||!allowedRoles.has(role)||!allowedScopes.has(scopeType))continue;const key=`${role}:${scopeType}:${scopeId}`;if(dedupe.has(key))continue;dedupe.add(key);result.push({role,scopeType,scopeId});}return result;
}
function membershipsFrom(value:unknown):OrganizationMembership[]{if(!Array.isArray(value))return [];return value.flatMap(item=>{if(!item||typeof item!=='object')return [];const row=item as Record<string,unknown>;const organizationId=stringOrNull(row.studio_id)||stringOrNull(row.organization_id);const role=row.role==='owner'?'owner':row.role==='manager'?'manager':row.role==='staff'?'staff':null;if(!organizationId||!role)return [];return [{organizationId,role,active:row.active===true}]})}
async function supabaseJson(url:string,init:RequestInit,publishableKey:string){const response=await fetch(url,{...init,headers:{apikey:publishableKey,'Content-Type':'application/json',...(init.headers||{})},cache:'no-store'});if(response.status===401||response.status===403)return null;if(!response.ok)throw new Error(`Supabase identity request failed (${response.status}).`);return response.json() as Promise<unknown>}

export async function authenticateSupabase(headers:Headers):Promise<SupabaseIdentityPrincipal|null>{
 const accessToken=bearer(headers);if(!accessToken)return null;const {url,publishableKey}=runtimeConfig();
 const authValue=await supabaseJson(`${url}/auth/v1/user`,{headers:{Authorization:`Bearer ${accessToken}`}},publishableKey);if(!authValue||typeof authValue!=='object')return null;const authUser=authValue as AuthUser;const userId=stringOrNull(authUser.id);if(!userId)return null;
 const contextValue=await supabaseJson(`${url}/rest/v1/rpc/current_identity`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`},body:'{}'},publishableKey);if(!contextValue||typeof contextValue!=='object')return null;const context=contextValue as IdentityContext;if(stringOrNull(context.user_id)!==userId||context.session_revoked===true)return null;
 const claims=tokenClaims(accessToken);const expiresAt=tokenExpiry(claims);if(!expiresAt||expiresAt<=Date.now())return null;const sessionId=stringOrNull(context.session_id);if(!sessionId)return null;const verifiedPhone=stringOrNull(context.verified_phone);const verifiedEmail=stringOrNull(context.verified_email);
 return {userId,sessionId,expiresAt,revoked:false,method:methodFor(authUser),verifiedPhone,verifiedEmail,displayName:stringOrNull(context.display_name)||verifiedPhone||verifiedEmail||'Sessions member',roles:rolesFrom(context.roles),scopedRoles:scopedRolesFrom(context.scoped_roles),memberships:membershipsFrom(context.memberships),assuranceLevel:assuranceLevel(claims),deviceRegistered:context.session_registered===true};
}
