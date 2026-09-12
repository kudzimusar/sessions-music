import {getProductionUser} from '@/app/chatgpt-auth';
import {hasPermission} from '@/lib/access-control';
import {canReadCustomerField} from '@/lib/data-access-policy';
import {isCorporateReadModule,moduleForId,type CorporateReadModule} from '@/lib/corporate-control-plane';
import {database} from '@/db/store';

const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
const scalar=async(db:any,sql:string,...bindings:unknown[])=>Number((await db.prepare(sql).bind(...bindings).first())?.n||0);
const money=(cents:number)=>`US$${(Math.max(0,Number(cents)||0)/100).toFixed(2)}`;
const customerRef=(value:unknown)=>{const text=String(value||'');return text.length>14?`${text.slice(0,8)}…${text.slice(-4)}`:text||'—'};
const rows=async(db:any,sql:string,...bindings:unknown[])=>((await db.prepare(sql).bind(...bindings).all()).results||[]) as any[];
const metric=(label:string,value:string|number,detail?:string)=>({label,value,detail});

async function bookings(db:any,showCustomer:boolean){
 const counts=await rows(db,"SELECT json_extract(content,'$.status') status,count(*) n FROM studio_bookings GROUP BY json_extract(content,'$.status')");
 const byStatus=Object.fromEntries(counts.map(row=>[String(row.status||'unknown'),Number(row.n||0)]));
 const recent=await rows(db,"SELECT id,studio_id,customer,json_extract(content,'$.roomName') room,json_extract(content,'$.status') status,json_extract(content,'$.date') date,json_extract(content,'$.duration') duration,json_extract(content,'$.createdAt') created_at FROM studio_bookings ORDER BY rowid DESC LIMIT 60");
 const columns=showCustomer?['Booking','Studio','Customer ref','Room','Status','Session date','Duration']:['Booking','Studio','Room','Status','Session date','Duration'];
 return {metrics:[metric('All bookings',Object.values(byStatus).reduce((a:any,b:any)=>Number(a)+Number(b),0)),metric('Requested',byStatus.requested||0),metric('Confirmed',byStatus.confirmed||0),metric('Completed',byStatus.completed||0),metric('Cancelled / declined',(byStatus.cancelled||0)+(byStatus.declined||0))],columns,rows:recent.map(row=>showCustomer?[row.id,row.studio_id,customerRef(row.customer),row.room||'—',row.status||'unknown',row.date||'—',`${Number(row.duration||0)} min`]:[row.id,row.studio_id,row.room||'—',row.status||'unknown',row.date||'—',`${Number(row.duration||0)} min`]),note:'Read-only Phase 4 projection from studio_bookings. Customer references are omitted unless the account separately has customer-directory authority. Booking mutation/escalation workflows remain Phase 5.'};
}

async function customers(db:any){
 const recent=await rows(db,"SELECT customer,count(*) booking_count,max(json_extract(content,'$.createdAt')) last_booking,max(json_extract(content,'$.date')) last_session FROM studio_bookings GROUP BY customer ORDER BY last_booking DESC LIMIT 100");
 const total=recent.length<100?recent.length:await scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings');
 const repeat=await scalar(db,'SELECT count(*) n FROM (SELECT customer FROM studio_bookings GROUP BY customer HAVING count(*) > 1)');
 const members=await scalar(db,"SELECT count(DISTINCT customer) n FROM studio_members WHERE json_extract(content,'$.status')='active'");
 return {metrics:[metric('Customers with bookings',total),metric('Repeat customers',repeat),metric('Active studio members',members)],columns:['Customer ref','Bookings','Latest booking activity','Latest session date'],rows:recent.map(row=>[customerRef(row.customer),Number(row.booking_count||0),row.last_booking||'—',row.last_session||'—']),note:'Customer control plane intentionally excludes names, phone numbers, email addresses, notes and private messages.'};
}

async function memberships(db:any,showCustomer:boolean){
 const counts=await rows(db,"SELECT json_extract(content,'$.status') status,count(*) n FROM studio_members GROUP BY json_extract(content,'$.status')");
 const byStatus=Object.fromEntries(counts.map(row=>[String(row.status||'unknown'),Number(row.n||0)]));
 const recent=await rows(db,"SELECT id,studio_id,customer,json_extract(content,'$.status') status,json_extract(content,'$.plan.name') plan,json_extract(content,'$.startsOn') starts_on,json_extract(content,'$.expiresOn') expires_on,json_extract(content,'$.createdAt') created_at FROM studio_members ORDER BY rowid DESC LIMIT 80");
 const columns=showCustomer?['Membership','Studio','Customer ref','Plan','Status','Starts','Expires']:['Membership','Studio','Plan','Status','Starts','Expires'];
 return {metrics:[metric('Active',byStatus.active||0),metric('Requested',byStatus.requested||0),metric('Cancelled / declined',(byStatus.cancelled||0)+(byStatus.declined||0))],columns,rows:recent.map(row=>showCustomer?[row.id,row.studio_id,customerRef(row.customer),row.plan||'—',row.status||'unknown',row.starts_on||'—',row.expires_on||'—']:[row.id,row.studio_id,row.plan||'—',row.status||'unknown',row.starts_on||'—',row.expires_on||'—']),note:'Providers remain commercial owners of their membership plans. Corporate access is oversight only; customer reference is omitted unless this account separately has customer-directory authority.'};
}

async function incidents(db:any){
 const [openIssues,failedNotifications,disputes]=await Promise.all([
  scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"),
  scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"),
  scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'"),
 ]);
 const issueRows=await rows(db,"SELECT id,json_extract(content,'$.studioId') studio_id,json_extract(content,'$.kind') kind,json_extract(content,'$.createdAt') created_at FROM studio_issues WHERE json_extract(content,'$.status')='open' ORDER BY rowid DESC LIMIT 30");
 const notificationRows=await rows(db,"SELECT id,booking_id,studio_id,kind,created_at FROM booking_notifications WHERE status='failed' ORDER BY created_at DESC LIMIT 30");
 const disputeRows=await rows(db,"SELECT id,booking_id,studio_id,updated_at FROM studio_settlements WHERE status='disputed' ORDER BY updated_at DESC LIMIT 30");
 const merged=[...issueRows.map(row=>({time:row.created_at||'',values:['Registry issue',row.id,row.studio_id||'—',row.kind||'issue',row.created_at||'—']})),...notificationRows.map(row=>({time:row.created_at||'',values:['Notification failure',row.id,row.studio_id||'—',row.kind||'notification',row.created_at||'—']})),...disputeRows.map(row=>({time:row.updated_at||'',values:['Settlement dispute',row.id,row.studio_id||'—','payment dispute',row.updated_at||'—']}))].sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,60);
 return {metrics:[metric('Open registry issues',openIssues),metric('Failed notifications',failedNotifications),metric('Settlement disputes',disputes),metric('Open signals',openIssues+failedNotifications+disputes)],columns:['Signal','Reference','Studio','Type','Last activity'],rows:merged.map(item=>item.values),note:'Phase 4 consolidates existing operational signals without inventing a second case database. Canonical incident/case ownership, SLA and escalation workflow begins in Phase 5.'};
}

async function analytics(db:any){
 const [bookings,completed,customers,bookable,activeMembers,gross,fees,openIssues,failedNotifications,disputes]=await Promise.all([
  scalar(db,'SELECT count(*) n FROM studio_bookings'),
  scalar(db,"SELECT count(*) n FROM studio_bookings WHERE json_extract(content,'$.status')='completed'"),
  scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings'),
  scalar(db,"SELECT count(*) n FROM studio_registry WHERE json_extract(content,'$.status')='bookable' AND COALESCE(json_extract(content,'$.bookingEnabled'),0)=1"),
  scalar(db,"SELECT count(*) n FROM studio_members WHERE json_extract(content,'$.status')='active'"),
  scalar(db,"SELECT COALESCE(sum(gross_cents),0) n FROM studio_settlements WHERE status='settled_off_platform'"),
  scalar(db,"SELECT COALESCE(sum(platform_fee_cents),0) n FROM studio_settlements WHERE status='settled_off_platform'"),
  scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"),
  scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"),
  scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'"),
 ]);
 return {metrics:[metric('Bookings',bookings),metric('Completed sessions',completed),metric('Customers',customers),metric('Bookable studios',bookable),metric('Active memberships',activeMembers),metric('Settled GMV',money(gross)),metric('Sessions fees',money(fees)),metric('Open operational signals',openIssues+failedNotifications+disputes)],columns:[],rows:[],note:'This is a bounded operational snapshot only. Page views, clicks, attribution, funnels, warehouse facts/dimensions and governed event analytics are Phase 9 work and are not fabricated here.'};
}

async function audit(db:any,includeOrganization:boolean,includeSecurity:boolean){
 const marketplace=await rows(db,'SELECT id,studio_id,actor,event,created_at FROM studio_audit ORDER BY created_at DESC LIMIT 80');
 const organization=includeOrganization?await rows(db,'SELECT id,actor,event,entity_type,entity_id,created_at FROM corporate_org_events ORDER BY created_at DESC LIMIT 80'):[];
 const security=includeSecurity?await rows(db,'SELECT id,actor,event,target_type,target_id,created_at FROM corporate_security_events ORDER BY created_at DESC LIMIT 80'):[];
 const merged=[...marketplace.map(row=>({time:row.created_at,values:['Marketplace',row.event,row.studio_id,row.actor,row.created_at]})),...organization.map(row=>({time:row.created_at,values:['Organization',row.event,`${row.entity_type}:${row.entity_id}`,row.actor,row.created_at]})),...security.map(row=>({time:row.created_at,values:['Security',row.event,`${row.target_type||'system'}:${row.target_id||'—'}`,row.actor,row.created_at]}))].sort((a,b)=>String(b.time).localeCompare(String(a.time))).slice(0,120);
 return {metrics:[metric('Marketplace events',marketplace.length),metric('Organization events',organization.length),metric('Security events',security.length)],columns:['Source','Event','Target','Actor','Time'],rows:merged.map(item=>item.values),note:includeSecurity?'Security events are visible because this account also has Super Administration authority. Event content payloads and identity-session IDs are intentionally not projected.':'Security-event payloads remain outside this audit projection; Super Administration authority is required to include the security stream.'};
}

export async function GET(request:Request){
 try{
  const user=await getProductionUser();if(!user)return response({error:'Sign in required.'},401);
  const moduleId=new URL(request.url).searchParams.get('module')||'';if(!isCorporateReadModule(moduleId))return response({error:'Unknown corporate module.'},404);
  const module=moduleForId(moduleId);if(!module)return response({error:'Unknown corporate module.'},404);
  if(!module.requiredPermissions.every(permission=>hasPermission(user,permission)))return response({error:'This corporate module is not assigned to this account.'},403);
  const db=database();let data:any;const canSeeCustomerRef=canReadCustomerField(user,'reference');
  if(moduleId==='bookings')data=await bookings(db,canSeeCustomerRef);
  else if(moduleId==='customers'){
   if(!canReadCustomerField(user,'activity'))return response({error:'Customer directory authority required.'},403);
   data=await customers(db);
  }else if(moduleId==='memberships')data=await memberships(db,canSeeCustomerRef);
  else if(moduleId==='incidents')data=await incidents(db);
  else if(moduleId==='analytics')data=await analytics(db);
  else data=await audit(db,hasPermission(user,'organization:manage'),hasPermission(user,'platform:roles.manage'));
  return response({module:moduleId,title:module.title,description:module.description,generatedAt:new Date().toISOString(),...data});
 }catch(error){console.error('Corporate control plane read failed',error instanceof Error?error.message:'Unknown error');return response({error:'Corporate control-plane data is temporarily unavailable.'},503)}
}
