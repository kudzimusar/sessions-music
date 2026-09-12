import {getProductionUser} from '@/app/chatgpt-auth';
import {canAccessSurface,hasPermission,permissionsForRoles} from '@/lib/access-control';
import {database} from '@/db/store';

const scalar=async(db:any,sql:string)=>Number((await db.prepare(sql).first())?.n||0);

export async function GET(){
 try{
  const user=await getProductionUser();
  if(!user)return Response.json({error:'Sign in required.'},{status:401,headers:{'Cache-Control':'no-store'}});
  if(!canAccessSurface(user,'corporate'))return Response.json({error:'Corporate authority required.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const db=database();const permissions=permissionsForRoles(user.roles);const overview:any={roles:user.roles,permissions,generatedAt:new Date().toISOString()};
  const controlPlane:any={};
  if(hasPermission(user,'bookings:read'))controlPlane.bookings=await scalar(db,'SELECT count(*) n FROM studio_bookings');
  if(hasPermission(user,'customers:read'))controlPlane.customers=await scalar(db,'SELECT count(DISTINCT customer) n FROM studio_bookings');
  if(hasPermission(user,'memberships:oversight'))controlPlane.activeMemberships=await scalar(db,"SELECT count(*) n FROM studio_members WHERE json_extract(content,'$.status')='active'");
  if(hasPermission(user,'incidents:read'))controlPlane.openSignals=(await scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"))+(await scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"))+(await scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'"));
  if(Object.keys(controlPlane).length)overview.controlPlane=controlPlane;
  if(hasPermission(user,'registry:read'))overview.marketplace={
   studios:await scalar(db,'SELECT count(*) n FROM studio_registry'),
   bookable:await scalar(db,"SELECT count(*) n FROM studio_registry WHERE json_extract(content,'$.status')='bookable' AND COALESCE(json_extract(content,'$.bookingEnabled'),0)=1"),
   pendingClaims:await scalar(db,"SELECT count(*) n FROM studio_claim_requests WHERE status='pending'"),
   pendingVerifications:await scalar(db,"SELECT count(*) n FROM studio_verification_requests WHERE status='pending'"),
  };
  if(hasPermission(user,'providers:oversight'))overview.providers={
   pendingRegistrations:await scalar(db,"SELECT count(*) n FROM studio_registrations WHERE status='pending'"),
   activeStaff:await scalar(db,"SELECT count(*) n FROM studio_staff WHERE status='active'"),
  };
  if(hasPermission(user,'settlements:review'))overview.finance={
   disputed:await scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status='disputed'"),
   awaitingPayment:await scalar(db,"SELECT count(*) n FROM studio_settlements WHERE status IN ('awaiting_payment','proof_submitted','payment_declined')"),
   invoices:await scalar(db,'SELECT count(*) n FROM studio_invoices'),
  };
  if(hasPermission(user,'support:read'))overview.support={
   openRegistryIssues:await scalar(db,"SELECT count(*) n FROM studio_issues WHERE json_extract(content,'$.status')='open'"),
   failedNotifications:await scalar(db,"SELECT count(*) n FROM booking_notifications WHERE status='failed'"),
  };
  return Response.json(overview,{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('Corporate overview failed',error instanceof Error?error.message:'Unknown error');return Response.json({error:'Corporate overview is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
