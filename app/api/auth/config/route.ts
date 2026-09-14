import {env} from 'cloudflare:workers';
import {NATIVE_AUTH_BOUNDARY} from '../../../../packages/product-core/index.js';

type RuntimeEnv={
  SESSIONS_IDENTITY_MODE?:string;
  SUPABASE_AUTH_ENABLED?:string;
  SUPABASE_URL?:string;
  SUPABASE_PUBLISHABLE_KEY?:string;
  SUPABASE_PHONE_AUTH_ENABLED?:string;
  SUPABASE_EMAIL_AUTH_ENABLED?:string;
  SUPABASE_GOOGLE_AUTH_ENABLED?:string;
  SUPABASE_APPLE_AUTH_ENABLED?:string;
  SUPABASE_CAPTCHA_PROVIDER?:string;
  SUPABASE_CAPTCHA_SITE_KEY?:string;
};

const enabled=(value?:string)=>value?.toLowerCase()==='true';
export async function GET(){
  const values=env as unknown as RuntimeEnv;
  const mode=values.SESSIONS_IDENTITY_MODE==='supabase'?'supabase':'chatgpt';
  const requested=mode==='supabase'&&enabled(values.SUPABASE_AUTH_ENABLED)&&!!values.SUPABASE_URL&&!!values.SUPABASE_PUBLISHABLE_KEY;
  const verifiedProject=requested&&values.SUPABASE_URL===NATIVE_AUTH_BOUNDARY.projectUrl&&!values.SUPABASE_URL.includes(NATIVE_AUTH_BOUNDARY.forbiddenProject);
  const configured=Boolean(verifiedProject);
  const captchaProvider=values.SUPABASE_CAPTCHA_PROVIDER==='turnstile'?'turnstile':null;
  return Response.json({
    mode,
    enabled:configured,
    reason:requested&&!verifiedProject?'Configured Supabase project does not match the verified Sessions identity authority.':!configured&&mode==='supabase'?'Sessions Supabase Auth is not fully configured.':undefined,
    projectRef:NATIVE_AUTH_BOUNDARY.projectRef,
    ...(configured?{url:values.SUPABASE_URL,publishableKey:values.SUPABASE_PUBLISHABLE_KEY}:{}),
    phoneEnabled:configured&&enabled(values.SUPABASE_PHONE_AUTH_ENABLED),
    emailEnabled:configured&&enabled(values.SUPABASE_EMAIL_AUTH_ENABLED),
    googleEnabled:configured&&enabled(values.SUPABASE_GOOGLE_AUTH_ENABLED),
    appleEnabled:configured&&enabled(values.SUPABASE_APPLE_AUTH_ENABLED),
    captchaProvider,
    ...(captchaProvider&&values.SUPABASE_CAPTCHA_SITE_KEY?{captchaSiteKey:values.SUPABASE_CAPTCHA_SITE_KEY}:{}),
  },{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
