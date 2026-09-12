import {getProductionUser} from '@/app/chatgpt-auth';
import {readState} from '@/db/store';
export async function GET(){
 try{
  const user=await getProductionUser();if(!user)return Response.json({error:'Sign in to Sessions to load workspace state.'},{status:401,headers:{'Cache-Control':'no-store'}});
  const state=await readState(user.id);
  return Response.json({...state,user:{id:user.id,displayName:user.displayName,method:user.method}},{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache'}});
 }catch{return Response.json({error:'Your saved workspace could not be loaded. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
