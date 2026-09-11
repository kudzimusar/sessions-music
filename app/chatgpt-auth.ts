import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { authenticateSupabase } from "@/lib/supabase-identity";
import type {IdentityMethod,OrganizationMembership,PlatformRole} from '@/lib/identity-core';

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
  memberships:OrganizationMembership[];
  method:IdentityMethod;
  sessionId:string;
};

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;

  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName =
    encodedFullName &&
    requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
      ? safeDecodeURIComponent(encodedFullName)
      : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

function withInheritedRoles(input:readonly PlatformRole[]):PlatformRole[]{
 const roles=new Set<PlatformRole>(input);
 // Corporate and super administrators are higher-level operational authorities.
 // This keeps legacy endpoints that require operations_admin compatible without
 // granting Operations to finance, support or trust/safety roles.
 if(roles.has('corporate_admin')||roles.has('super_admin'))roles.add('operations_admin');
 return [...roles];
}

function configuredPreviewRoles(email:string):PlatformRole[]{
  const values=env as unknown as Record<string,string|undefined>;
  const address=email.toLowerCase();
  const listed=(name:string)=>((values[name]||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)).includes(address);
  const roles:PlatformRole[]=['musician'];
  // Backwards compatibility: the old SESSIONS_ADMIN_EMAILS list was the only privileged preview list.
  // Treat those explicitly configured accounts as super admins rather than granting authority to every signed-in user.
  if(listed('SESSIONS_SUPER_ADMIN_EMAILS')||listed('SESSIONS_ADMIN_EMAILS'))roles.push('super_admin');
  if(listed('SESSIONS_CORPORATE_ADMIN_EMAILS'))roles.push('corporate_admin');
  if(listed('SESSIONS_OPERATIONS_EMAILS'))roles.push('operations_admin');
  if(listed('SESSIONS_FINANCE_EMAILS'))roles.push('finance_admin');
  if(listed('SESSIONS_TRUST_SAFETY_EMAILS'))roles.push('trust_safety');
  if(listed('SESSIONS_SUPPORT_EMAILS'))roles.push('support_agent');
  return withInheritedRoles(roles);
}

export async function getProductionUser():Promise<SessionUser|null>{
  const requestHeaders=await headers();
  const values=env as unknown as {SESSIONS_IDENTITY_MODE?:string};
  if(values.SESSIONS_IDENTITY_MODE==='supabase'){
    const principal=await authenticateSupabase(requestHeaders);
    return principal?{
      id:principal.userId,
      displayName:principal.displayName,
      email:principal.verifiedEmail,
      phone:principal.verifiedPhone,
      roles:withInheritedRoles(principal.roles),
      memberships:principal.memberships,
      method:principal.method,
      sessionId:principal.sessionId,
    }:null;
  }
  const preview=await getChatGPTUser();
  return preview?{
    id:preview.email.toLowerCase(),displayName:preview.displayName,email:preview.email.toLowerCase(),phone:null,
    roles:configuredPreviewRoles(preview.email),memberships:[],method:'chatgpt_demo',sessionId:'chatgpt-dispatch',
  }:null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
