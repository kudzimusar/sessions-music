import {env} from 'cloudflare:workers';
import {getProductionUser,type SessionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {canReadCustomerField} from '@/lib/data-access-policy';
import {isCorporateReadModule,moduleForId} from '@/lib/corporate-control-plane';
import {database} from '@/db/store';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
const statement=(db:any,sql:string,bindings:unknown[])=>{const prepared=db.prepare(sql);return bindings.length?prepared.bind(...bindings):prepared};
const scalar=async(db:any,sql:string,...bindings:unknown[])=>Number((await statement(db,sql,bindings).first())?.n||0);
const rows=async(db:any,sql:string,...bindings:unknown[])=>((await statement(db,sql,bindings).all()).results||[]) as any[];
const money=(cents:number)=>`US$${(Math.max(0,Number(cents)||0)/100).toFixed(2)}`;
const maskedRef=(value:unknown)=>{const text=String(value||'');return text.length>14?`${text.slice(0,8)}…${text.slice(-4)}`:text||'—'};
const metric=(label:string,value:string|number,detail?:string)=>({label,value,detail});
const runtime=()=>env as unknown as Record<string,string|undefined>;
const flag=(values:Record<string,string|undefined>,name:string)=>String(values[name]||'').toLowerCase()==='true';
const configured=(values:Record<string,string|undefined>,...names:string[])=>names.every(name=>!!String(values[name]||'').trim());

async function bookings(db:any,showCustomer:boolean){
 const counts=await rows(db,"SELECT json_extract(content,'$.status') status,count(*) n FROM studio_bookings GROUP BY json_extract(content,'$.status')");
 const byStatus=Object.fromEntries(counts.map(row=>[String(row.status||'unknown'),Number(row.n||0)]));
 const recent=await rows(db,"SELECT id,studio_id,customer,json_extract(content,'$.roomName') room,json_extract(content,'$.status') status,json_extract(content,'$.date') date,json_extract(content,'$.duration') duration FROM studio_bookings ORDER BY rowid DESC LIMIT 60");
 const columns=showCustomer?['Booking','Studio','Customer ref','Room','Status','Session date','Duration']:['Booking','Studio','Room','Status','Session date','Duration'];
 return {metrics:[metric('All bookings',Object.values(byStatus).reduce((a:any,b:any)=>Number(a)+Number(b),0)),metric('Requested',byStatus.requested||0),metric('Confirmed',byStatus.confirmed||0),metric('Completed',byStatus.completed||0),metric('Cancelled / declined',(byStatus.cancelled||0)+(byStatus.declined||0))],columns,rows:recent.map(row=>showCustomer?[row.id,row.studio_id,maskedRef(row.customer),row.room||'—',row.status||'unknown',row.date||'—',`${Number(row.duration||0)} min`]:[row.id,row.studio_id,row.room||'—',row.status||'unknown',row.date||'—',`${Number(row.duration||0)} min`]),note:'Read-only Phase 4 projection from studio_bookings. Customer references are omitted unless the account separately has customer-directory authority. Booking mutation, assignment, timeline and escalation workflows remain Phase 5.'};
}

async function customers(db:any){
 const recent=await rows(db,"SELECT customer,count(*) booking_count,max(json_extract(content,'$.createdAt')) last_booking,max(json_extract(content,'$.date')) last_session FROM studio_bookings GROUP BY customer ORDER BY last_booking DESC LIMIT 100");
 const total=recent.length<100?recent.length:await scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings');
 const repeat=await scalar(db,'SELECT count(*) n FROM (SELECT customer FROM studio_bookings GROUP BY customer HAVING count(*) > 1)');
 const members=await scalar(db,"SELECT count(DISTINCT customer) n FROM studio_members WHERE json_extract(content,'$.status')='active'");
 return {metrics:[metric('Customers with bookings',total),metric('Repeat customers',repeat),metric('Active studio members',members)],columns:['Customer ref','Bookings','Latest booking activity','Latest session date'],rows:recent.map(row=>[maskedRef(row.customer),Number(row.booking_count||0),row.last_booking||'—',row.last_session||'—']),note:'Customer control plane intentionally excludes names, phone numbers, email addresses, notes and private booking messages. Direct contact access remains purpose- and field-controlled.'};
}

async function memberships(db:any,showCustomer:boolean){
 const counts=await rows(db,"SELECT json_extract(content,'$.status') status,count(*) n FROM studio_members GROUP BY json_extract(content,'$.status')");
 const byStatus=Object.fromEntries(counts.map(row=>[String(row.status||'unknown'),Number(row.n||0)]));
 const recent=await rows(db,"SELECT id,studio_id,customer,json_extract(content,'$.status') status,json_extract(content,'$.plan.name') plan,json_extract(content,'$.startsOn') starts_on,json_extract(content,'$.expiresOn') expires_on FROM studio_members ORDER BY rowid DESC LIMIT 80");
 const columns=showCustomer?['Membership','Studio','Customer ref','Plan','Status','Starts','Expires']:['Membership','Studio','Plan','Status','Starts','Expires'];
 return {metrics:[metric('Active',byStatus.active||0),metric('Requested',byStatus.requested||0),metric('Cancelled / declined',(byStatus.cancelled||0)+(byStatus.declined||0))],columns,rows:recent.map(row=>showCustomer?[row.id,row.studio_id,maskedRef(row.customer),row.plan||'—',row.status||'unknown',row.starts_on||'—',row.expires_on||'—']:[row.id,row.studio_id,row.plan||'—',row.status||'unknown',row.starts_on||'—',row.expires_on||'—']),note:'Providers remain commercial owners of their membership plans. Corporate access is oversight only. Finance/retention workflow expansion remains Phase 6.'};
}

async function incidents(db:any){
 const [openIssues,failedNotifications,disputes]=await Promise.all([scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"),scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"),scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'")]);
 const issueRows=await rows(db,"SELECT id,json_extract(content,'$.studioId') studio_id,json_extract(content,'$.kind') kind,json_extract(content,'$.createdAt') created_at FROM studio_issues WHERE json_extract(content,'$.status')='open' ORDER BY rowid DESC LIMIT 30");
 const notificationRows=await rows(db,"SELECT id,studio_id,kind,created_at FROM booking_notifications WHERE status='failed' ORDER BY created_at DESC LIMIT 30");
 const disputeRows=await rows(db,"SELECT id,studio_id,updated_at FROM studio_settlements WHERE status='disputed' ORDER BY updated_at DESC LIMIT 30");
 const merged=[...issueRows.map(row=>({time:row.created_at||'',values:['Registry issue',row.id,row.studio_id||'—',row.kind||'issue',row.created_at||'—']})),...notificationRows.map(row=>({time:row.created_at||'',values:['Notification failure',row.id,row.studio_id||'—',row.kind||'notification',row.created_at||'—']})),...disputeRows.map(row=>({time:row.updated_at||'',values:['Settlement dispute',row.id,row.studio_id||'—','payment dispute',row.updated_at||'—']}))].sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,60);
 return {metrics:[metric('Open registry issues',openIssues),metric('Failed notifications',failedNotifications),metric('Settlement disputes',disputes),metric('Open signals',openIssues+failedNotifications+disputes)],columns:['Signal','Reference','Studio','Type','Last activity'],rows:merged.map(item=>item.values),note:'Phase 4 consolidates existing operational signals without inventing a second case database. Canonical case ownership, SLA, assignment, evidence and escalation workflow begins in Phase 5.'};
}

async function growth(db:any){
 const [customers,repeat,completed,activeMembers,bookable]=await Promise.all([scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings'),scalar(db,'SELECT count(*) n FROM (SELECT customer FROM studio_bookings GROUP BY customer HAVING count(*) > 1)'),scalar(db,"SELECT count(*) n FROM studio_bookings WHERE json_extract(content,'$.status')='completed'"),scalar(db,"SELECT count(*) n FROM studio_members WHERE json_extract(content,'$.status')='active'"),scalar(db,"SELECT count(*) n FROM studio_registry WHERE json_extract(content,'$.status')='bookable' AND COALESCE(json_extract(content,'$.bookingEnabled'),0)=1")]);
 const repeatRate=customers?`${Math.round((repeat/customers)*100)}%`:'0%';
 return {metrics:[metric('Customers',customers),metric('Repeat customers',repeat),metric('Repeat share',repeatRate),metric('Completed sessions',completed),metric('Active memberships',activeMembers),metric('Bookable studios',bookable)],columns:[],rows:[],note:'These are canonical operational growth signals only. Acquisition source, CAC, campaign attribution, page views, click funnels and conversion attribution require the governed Phase 9 event pipeline and are intentionally not fabricated.'};
}

async function analytics(db:any,user:SessionUser){
 const [bookings,completed,customers,bookable,activeMembers,openIssues,failedNotifications,disputes]=await Promise.all([scalar(db,'SELECT count(*) n FROM studio_bookings'),scalar(db,"SELECT count(*) n FROM studio_bookings WHERE json_extract(content,'$.status')='completed'"),scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings'),scalar(db,"SELECT count(*) n FROM studio_registry WHERE json_extract(content,'$.status')='bookable' AND COALESCE(json_extract(content,'$.bookingEnabled'),0)=1"),scalar(db,"SELECT count(*) n FROM studio_members WHERE json_extract(content,'$.status')='active'"),scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"),scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"),scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'")]);
 const metrics=[metric('Bookings',bookings),metric('Completed sessions',completed),metric('Customers',customers),metric('Bookable studios',bookable),metric('Active memberships',activeMembers),metric('Open operational signals',openIssues+failedNotifications+disputes)];
 if(hasPermission(user,'analytics:finance.read')||hasPermission(user,'analytics:executive.read')){const [gross,fees]=await Promise.all([scalar(db,"SELECT COALESCE(sum(gross_cents),0) n FROM studio_settlements WHERE status='settled_off_platform'"),scalar(db,"SELECT COALESCE(sum(platform_fee_cents),0) n FROM studio_settlements WHERE status='settled_off_platform'")]);metrics.push(metric('Settled GMV',money(gross)),metric('Sessions fees',money(fees)))}
 return {metrics,columns:[],rows:[],note:'This is a permission-filtered operational snapshot. Page views, clicks, attribution, funnels, warehouse facts/dimensions and governed metric definitions remain Phase 9 work.'};
}

async function platform(db:any){
 const values=runtime();const [studios,bookings,uploads,failedNotifications]=await Promise.all([scalar(db,'SELECT count(*) n FROM studio_registry'),scalar(db,'SELECT count(*) n FROM studio_bookings'),scalar(db,'SELECT count(*) n FROM uploads'),scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'")]);
 const readiness=[
  ['Identity authority',String(values.SESSIONS_IDENTITY_MODE||'chatgpt')==='supabase'&&configured(values,'SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY')?'Production provider configured':'Preview / certification pending'],
  ['Customer payments',flag(values,'PAYMENTS_GATEWAY_ENABLED')?'Enabled':'Disabled'],
  ['Platform billing',flag(values,'BILLING_ENABLED')?'Enabled':'Disabled'],
  ['Google Calendar',flag(values,'GOOGLE_CALENDAR_ENABLED')&&configured(values,'GOOGLE_CALENDAR_ID')?'Configured':'Not configured'],
  ['Email provider',flag(values,'EMAIL_PROVIDER_ENABLED')&&configured(values,'EMAIL_PROVIDER_ENDPOINT')?'Configured':'Not configured'],
  ['AI requirement extraction',flag(values,'AI_SEARCH_ENABLED')&&configured(values,'OPENAI_API_KEY')?'Configured':'Not configured'],
 ];
 return {metrics:[metric('Registry studios',studios),metric('Canonical bookings',bookings),metric('Media records',uploads),metric('Failed notifications',failedNotifications)],columns:['Capability','Readiness'],rows:readiness,note:'Only non-secret readiness is exposed. Credentials, tokens, endpoint secrets and provider keys are never returned. Native mobile architecture remains Phase 10 and production integration certification remains Phase 11.'};
}

async function settings(db:any){
 const values=runtime();const [activeFees,loyalty]=await Promise.all([scalar(db,"SELECT count(*) n FROM fee_policies WHERE status='active'"),rows(db,'SELECT enabled,credit_cents,revision FROM loyalty_credit_settings ORDER BY rowid DESC LIMIT 1')]);const current=loyalty[0];
 return {metrics:[metric('Active fee policies',activeFees),metric('Loyalty credit',current?Number(current.enabled)===1?'Enabled':'Disabled':'Not configured'),metric('Application mode',values.SESSIONS_APP_MODE||'production'),metric('Identity mode',values.SESSIONS_IDENTITY_MODE||'chatgpt')],columns:['Policy','State'],rows:[['Currency','USD enabled · ZiG readiness '+(flag(values,'ZIG_ENABLED')?'enabled':'disabled')],['Demo sandbox',flag(values,'SESSIONS_DEMO_ENABLED')?'Enabled and isolated':'Disabled'],['Billing mode',values.BILLING_MODE||'test'],['Loyalty revision',current?String(current.revision):'—']],note:'Phase 4 exposes non-secret corporate policy posture only. Fee/loyalty mutations continue through their separately authorized server endpoints; environment and integration changes remain deployment-controlled.'};
}

async function audit(db:any,includeOrganization:boolean,includeSecurity:boolean){
 const marketplace=await rows(db,'SELECT id,studio_id,actor,event,created_at FROM studio_audit ORDER BY created_at DESC LIMIT 80');
 const organization=includeOrganization?await rows(db,'SELECT id,actor,event,entity_type,entity_id,created_at FROM corporate_org_events ORDER BY created_at DESC LIMIT 80'):[];
 const security=includeSecurity?await rows(db,'SELECT id,actor,event,target_type,target_id,created_at FROM corporate_security_events ORDER BY created_at DESC LIMIT 80'):[];
 const merged=[...marketplace.map(row=>({time:row.created_at,values:['Marketplace',row.event,row.studio_id,maskedRef(row.actor),row.created_at]})),...organization.map(row=>({time:row.created_at,values:['Organization',row.event,`${row.entity_type}:${row.entity_id}`,maskedRef(row.actor),row.created_at]})),...security.map(row=>({time:row.created_at,values:['Security',row.event,`${row.target_type||'system'}:${row.target_id||'—'}`,maskedRef(row.actor),row.created_at]}))].sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,120);
 return {metrics:[metric('Marketplace events',marketplace.length),metric('Organization events',organization.length),metric('Security events',security.length)],columns:['Source','Event','Target','Actor ref','Time'],rows:merged.map(item=>item.values),note:includeSecurity?'Security events are included because this account has security-read authority. Actor references are masked; event payloads and identity-session IDs are not projected.':'Security events require separate security-read authority. Actor references are masked and payloads are excluded.'};
}

export async function GET(request:Request){
 try{
  const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);
  const moduleId=new URL(request.url).searchParams.get('module')||'';if(!isCorporateReadModule(moduleId))return response({error:'Unknown corporate module.'},404);
  const module=moduleForId(moduleId);if(!module)return response({error:'Unknown corporate module.'},404);
  if(!module.requiredPermissions.every(permission=>hasPermission(user,permission)))return response({error:'This corporate module is not assigned to this account.'},403);
  const db=database();let data:any;const canSeeCustomerRef=canReadCustomerField(user,'reference');
  if(moduleId==='bookings')data=await bookings(db,canSeeCustomerRef);
  else if(moduleId==='customers'){if(!canReadCustomerField(user,'activity'))return response({error:'Customer directory authority required.'},403);data=await customers(db)}
  else if(moduleId==='memberships')data=await memberships(db,canSeeCustomerRef);
  else if(moduleId==='incidents')data=await incidents(db);
  else if(moduleId==='growth')data=await growth(db);
  else if(moduleId==='analytics')data=await analytics(db,user);
  else if(moduleId==='platform')data=await platform(db);
  else if(moduleId==='settings')data=await settings(db);
  else data=await audit(db,hasPermission(user,'organization:manage'),hasPermission(user,'security:read'));
  return response({module:moduleId,title:module.title,description:module.description,generatedAt:new Date().toISOString(),...data});
 }catch(error){console.error('Corporate control plane read failed',error instanceof Error?error.message:'Unknown error');return response({error:'Corporate control-plane data is temporarily unavailable.'},503)}
}
