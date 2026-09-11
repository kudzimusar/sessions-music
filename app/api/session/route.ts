import {getProductionUser} from '@/app/chatgpt-auth';
import {canAccessSurface,permissionsForRoles,roleLabel} from '@/lib/access-control';

export async function GET(){
 try{
  const user=await getProductionUser();
  if(!user)return Response.json({user:null,capabilities:{customer:false,provider:false,corporate:false},permissions:[]},{status:401,headers:{'Cache-Control':'no-store'}});
  return Response.json({
   user:{...user,roles:user.roles.map(role=>({role,label:roleLabel(role)}))},
   capabilities:{
    customer:canAccessSurface(user,'customer'),
    provider:canAccessSurface(user,'provider'),
    corporate:canAccessSurface(user,'corporate'),
   },
   permissions:permissionsForRoles(user.roles),
  },{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({error:'Session authority could not be resolved.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
