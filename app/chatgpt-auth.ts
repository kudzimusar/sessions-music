import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { authenticateSupabase,type AuthenticationAssuranceLevel } from "@/lib/supabase-identity";
import type {IdentityMethod,OrganizationMembership,PlatformRole,ScopedPlatformRole} from '@/lib/identity-core';
import {corporateRoles} from '@/lib/access-control';
import {database} from '@/db/store';

export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export type SessionUser={
  id:string;
  displayName:string;
  email:string|null;
  phone:string|null;
  roles:PlatformRole[];
  scopedRoles:ScopedPlatformRole[];
  memberships:OrganizationMembership[];
  method:IdentityMethod;
  sessionId:string;
  assuranceLevel:AuthenticationAssuranceLevel;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";
const SUPABASE_SESSION_COOKIE='__Host-sessions_access';
const corporateRoleSet=new Set<PlatformRole>(corporateRoles);

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;
  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName = encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8 ? safeDecodeURIComponent(encodedFullName) : null;
  return {displayName: fullName ?? email,email,fullName};
}

function withInheritedRoles(input:readonly PlatformRole[]):PlatformRole[]{
 const roles=new Set<PlatformRole>(input);
 if(roles.has('corporate_admin')||roles.has('super_admin'))roles.add('operations_admin');
 return [...roles];
}

async function effectiveProductionAuthority(userId:string,rawRoles:readonly PlatformRole[],scopedRoles:readonly ScopedPlatformRole[]){
 const roles=withInheritedRoles(rawRoles);
 if(!roles.some(role=>corporateRoleSet.has(role))&&!scopedRoles.some(value=>corporateRoleSet.has(value.role)))return {roles,scopedRoles:[...scopedRoles]};
 let activeStaff=false;
 try{
  const row=await database().prepare("SELECT 1 ok FROM corporate_staff s LEFT JOIN corporate_staff_access_state a ON a.staff_id=s.id WHERE s.user_id=? AND s.status='active' AND COALESCE(a.status,'active')='active' LIMIT 1").bind(userId).first();
  activeStaff=!!row;
 }catch(error){
  // Production corporate authority fails closed if workforce/access state cannot be proven.
  console.error('Corporate employment authority check failed',error instanceof Error?error.message:'Unknown error');
 }
 if(activeStaff)return {roles,scopedRoles:[...scopedRoles]};
 return {
  roles:roles.filter(role=>!corporateRoleSet.has(role)),
  scopedRoles:scopedRoles.filter(value=>!corporateRoleSet.has(value.role)),
 };
}

function configuredPreviewRoles(email:string):PlatformRole[]{
  const values=env as unknown as Record<string,string|undefined>;
  const address=email.toLowerCase();
  const listed=(name:string)=>((values[name]||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)).includes(address);
  const roles:PlatformRole[]=['musician'];
  const mappings:readonly [string,PlatformRole][]=[
    ['SESSIONS_SUPER_ADMIN_EMAILS','super_admin'],['SESSIONS_SUPER_ADMIN_ELIGIBLE_EMAILS','super_admin_eligible'],
    ['SESSIONS_CORPORATE_ADMIN_EMAILS','corporate_admin'],['SESSIONS_OPERATIONS_EMAILS','operations_admin'],
    ['SESSIONS_FINANCE_EMAILS','finance_admin'],['SESSIONS_FINANCE_MANAGER_EMAILS','finance_manager'],
    ['SESSIONS_TRUST_SAFETY_EMAILS','trust_safety'],['SESSIONS_TRUST_SAFETY_MANAGER_EMAILS','trust_safety_manager'],
    ['SESSIONS_SUPPORT_EMAILS','support_agent'],['SESSIONS_SUPPORT_MANAGER_EMAILS','support_manager'],
    ['SESSIONS_PROVIDER_OPERATIONS_EMAILS','provider_operations'],['SESSIONS_PROVIDER_OPERATIONS_MANAGER_EMAILS','provider_operations_manager'],
    ['SESSIONS_GROWTH_ANALYST_EMAILS','growth_analyst'],['SESSIONS_GROWTH_MANAGER_EMAILS','growth_manager'],
    ['SESSIONS_DATA_ANALYST_EMAILS','data_analyst'],['SESSIONS_DATA_ADMIN_EMAILS','data_admin'],
    ['SESSIONS_PRODUCT_OPERATIONS_EMAILS','product_operations'],['SESSIONS_GOVERNANCE_REVIEWER_EMAILS','governance_reviewer'],
  ];
  if(listed('SESSIONS_ADMIN_EMAILS'))roles.push('super_admin');
  for(const [name,role] of mappings)if(listed(name))roles.push(role);
  return withInheritedRoles([...new Set(roles)]);
}

function cookieValue(cookieHeader:string|null,name:string){
 if(!cookieHeader)return null;
 for(const part of cookieHeader.split(';')){const [rawName,...rest]=part.trim().split('=');if(rawName===name){try{return decodeURIComponent(rest.join('='))}catch{return null}}}
 return null;
}

export async function getProductionUser():Promise<SessionUser|null>{
  const requestHeaders=await headers();
  const values=env as unknown as {SESSIONS_IDENTITY_MODE?:string};
  if(values.SESSIONS_IDENTITY_MODE==='supabase'){
    let authHeaders:Headers|typeof requestHeaders=requestHeaders;
    if(!requestHeaders.get('authorization')){
      const token=cookieValue(requestHeaders.get('cookie'),SUPABASE_SESSION_COOKIE);
      if(token&&token.length<20_000){const derived=new Headers(requestHeaders);derived.set('Authorization',`Bearer ${token}`);authHeaders=derived}
    }
    const principal=await authenticateSupabase(authHeaders);
    if(!principal)return null;
    const authority=await effectiveProductionAuthority(principal.userId,principal.roles,principal.scopedRoles);
    return {
      id:principal.userId,displayName:principal.displayName,email:principal.verifiedEmail,phone:principal.verifiedPhone,
      roles:authority.roles,scopedRoles:authority.scopedRoles,memberships:principal.memberships,
      method:principal.method,sessionId:principal.sessionId,assuranceLevel:principal.assuranceLevel,
    };
  }
  const preview=await getChatGPTUser();
  return preview?{
    id:preview.email.toLowerCase(),displayName:preview.displayName,email:preview.email.toLowerCase(),phone:null,
    roles:configuredPreviewRoles(preview.email),scopedRoles:[],memberships:[],method:'chatgpt_demo',sessionId:'chatgpt-dispatch',assuranceLevel:null,
  }:null;
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();if (user) return user;redirect(chatGPTSignInPath(returnTo));
}
export function chatGPTSignInPath(returnTo: string): string {return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;}
export function chatGPTSignOutPath(returnTo = "/"): string {return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;}
function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;try {url = new URL(value, "https://app.local");} catch {return "/";}
  if (url.origin !== "https://app.local"||isReservedAuthPath(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}
function isReservedAuthPath(pathname: string): boolean {return pathname===SIGN_IN_PATH||pathname===SIGN_OUT_PATH||pathname===CALLBACK_PATH;}
function safeDecodeURIComponent(value: string): string | null {try{return decodeURIComponent(value)}catch{return null}}
