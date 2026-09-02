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
      roles:principal.roles,
      memberships:principal.memberships,
      method:principal.method,
      sessionId:principal.sessionId,
    }:null;
  }
  const demo=await getChatGPTUser();
  return demo?{
    id:demo.email.toLowerCase(),displayName:demo.displayName,email:demo.email.toLowerCase(),phone:null,
    roles:['musician'],memberships:[],method:'chatgpt_demo',sessionId:'chatgpt-dispatch',
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
