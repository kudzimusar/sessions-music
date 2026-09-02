import {env} from 'cloudflare:workers';
import {database} from '@/db/store';
import type {Studio,StudioBooking} from '@/lib/registry';
import {base64UrlBytes,base64UrlJson,platformCalendarEvent,platformCalendarEventId,PLATFORM_TIME_ZONE} from '@/lib/platform-calendar';

type Runtime=Record<string,string|undefined>;
type SyncStatus='synced'|'awaiting_setup'|'failed'|'not_applicable';
let cachedToken:{value:string;expiresAt:number;account:string}|null=null;

const runtime=()=>env as unknown as Runtime;

export function platformCalendarConfiguration(){
 const c=runtime();
 const enabled=c.GOOGLE_CALENDAR_ENABLED==='true';
 const ready=enabled&&!!c.GOOGLE_CALENDAR_ID&&!!c.GOOGLE_SERVICE_ACCOUNT_EMAIL&&!!c.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
 return {enabled,ready,model:'platform' as const,name:c.GOOGLE_CALENDAR_NAME||'Sessions Music Bookings',timeZone:PLATFORM_TIME_ZONE};
}

function privateKeyBytes(value:string){
 const body=value.replaceAll('\\n','\n').replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
 if(!body)throw new Error('Google Calendar private key is missing');
 const binary=atob(body);return Uint8Array.from(binary,char=>char.charCodeAt(0));
}

async function accessToken(){
 const c=runtime(),account=c.GOOGLE_SERVICE_ACCOUNT_EMAIL||'';
 if(cachedToken&&cachedToken.account===account&&cachedToken.expiresAt>Date.now()+60_000)return cachedToken.value;
 const now=Math.floor(Date.now()/1000),header=base64UrlJson({alg:'RS256',typ:'JWT'}),claims=base64UrlJson({iss:account,scope:'https://www.googleapis.com/auth/calendar.events',aud:'https://oauth2.googleapis.com/token',iat:now-30,exp:now+3300});
 const input=`${header}.${claims}`;
 const key=await crypto.subtle.importKey('pkcs8',privateKeyBytes(c.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY||''),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const signature=base64UrlBytes(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(input))));
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(20_000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${input}.${signature}`})});
 if(!response.ok)throw new Error(`Google authentication returned ${response.status}`);
 const value=await response.json() as {access_token?:string;expires_in?:number};
 if(!value.access_token)throw new Error('Google authentication returned no access token');
 cachedToken={value:value.access_token,expiresAt:Date.now()+Math.max(300,Number(value.expires_in)||3600)*1000,account};return value.access_token;
}

async function writeEvent(studio:Studio,booking:StudioBooking){
 const c=runtime(),eventId=await platformCalendarEventId(booking.id),body=platformCalendarEvent(studio,booking,eventId),token=await accessToken();
 const base=`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.GOOGLE_CALENDAR_ID||'')}/events`;
 const init:RequestInit={method:'POST',signal:AbortSignal.timeout(20_000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)};
 let response=await fetch(`${base}?sendUpdates=none`,init);
 if(response.status===409)response=await fetch(`${base}/${eventId}?sendUpdates=none`,{...init,method:'PUT'});
 if(!response.ok)throw new Error(`Google Calendar returned ${response.status}`);
 return eventId;
}

export async function syncPlatformCalendar(studio:Studio,booking:StudioBooking):Promise<{status:SyncStatus}> {
 if(!['confirmed','cancelled','completed'].includes(booking.status))return {status:'not_applicable'};
 const config=platformCalendarConfiguration(),db=database(),now=new Date().toISOString();
 if(!config.ready){
  await db.prepare("INSERT INTO studio_calendar_events(booking_id,studio_id,event_id,status,updated_at,content) VALUES(?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,content=excluded.content").bind(booking.id,studio.id,'','awaiting_setup',now,JSON.stringify({bookingStatus:booking.status,lastError:''})).run();
  return {status:'awaiting_setup'};
 }
 try{
  const eventId=await writeEvent(studio,booking);
  await db.prepare("INSERT INTO studio_calendar_events(booking_id,studio_id,event_id,status,updated_at,content) VALUES(?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET event_id=excluded.event_id,status=excluded.status,updated_at=excluded.updated_at,content=excluded.content").bind(booking.id,studio.id,eventId,'synced',now,JSON.stringify({bookingStatus:booking.status,lastError:''})).run();
  return {status:'synced'};
 }catch(error){
  const message=error instanceof Error?error.message:'Calendar sync failed';
  console.error('Platform calendar sync failed',message);
  await db.prepare("INSERT INTO studio_calendar_events(booking_id,studio_id,event_id,status,updated_at,content) VALUES(?,?,?,?,?,?) ON CONFLICT(booking_id) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,content=excluded.content").bind(booking.id,studio.id,'','failed',now,JSON.stringify({bookingStatus:booking.status,lastError:message.slice(0,200)})).run();
  return {status:'failed'};
 }
}
