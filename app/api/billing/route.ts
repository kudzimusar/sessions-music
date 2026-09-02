import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/db/store';
import {billingConfiguration,startCheckout,reconcileCheckout,billingPortal} from '@/lib/billing-server';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:Request){try{
 const config=billingConfiguration(),user=await getChatGPTUser(),studioId=new URL(req.url).searchParams.get('studio');if(!user||!studioId)return reply({...config,account:null,checkouts:[]});
 const owner=await database().prepare('SELECT owner FROM studio_registry WHERE id=?').bind(studioId).first();if(owner?.owner!==user.email.toLowerCase())return reply({...config,account:null,checkouts:[]});
 const account=await database().prepare('SELECT content FROM billing_accounts WHERE studio_id=?').bind(studioId).first();const checkouts=(await database().prepare('SELECT * FROM billing_checkouts WHERE studio_id=? ORDER BY created_at DESC LIMIT 20').bind(studioId).all()).results.map((r:any)=>{const c=JSON.parse(r.content);return {id:r.id,provider:r.provider,status:r.status,createdAt:r.created_at,url:r.status==='pending'?c.url:null,amount:c.amount,mode:c.mode};});
 const a=account?JSON.parse(account.content):null;return reply({...config,account:a?{provider:a.provider,status:a.status,paidUntil:a.paidUntil,mode:a.mode}:null,checkouts});
 }catch{return reply({error:'Billing status is temporarily unavailable'},503);}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Cross-origin request rejected'},403);
 const user=await getChatGPTUser();if(!user)return reply({error:'Sign in to manage studio subscriptions'},401);const raw=await req.text();if(raw.length>3000)return reply({error:'Request too large'},413);
 const p=z.object({action:z.enum(['checkout','refresh','portal']),studioId:z.string().min(1).max(100),id:z.string().uuid().optional(),provider:z.enum(['stripe','paypal','paynow']).optional(),consent:z.boolean().optional()}).parse(JSON.parse(raw));
 const owner=await database().prepare('SELECT owner FROM studio_registry WHERE id=?').bind(p.studioId).first();if(owner?.owner!==user.email.toLowerCase())return reply({error:'Only the verified studio owner can manage its billing'},403);
 if(p.action==='checkout'){if(!p.id||!p.provider||!p.consent)return reply({error:'Review and accept the subscription terms first'},400);return reply(await startCheckout(p.studioId,user.email.toLowerCase(),p.provider,p.id));}
 if(p.action==='portal')return reply({url:await billingPortal(p.studioId)});
 if(!p.id)return reply({error:'Select a checkout to refresh'},400);const row=await database().prepare('SELECT studio_id FROM billing_checkouts WHERE id=?').bind(p.id).first();if(row?.studio_id!==p.studioId)return reply({error:'Checkout belongs to another studio'},403);return reply(await reconcileCheckout(p.id));
 }catch(e){return reply({error:e instanceof z.ZodError?'Check the subscription request.':e instanceof Error&&!/SQL|constraint|UNIQUE/i.test(e.message)?e.message:'A checkout is already in progress. Refresh its status before retrying.'},400);}}
