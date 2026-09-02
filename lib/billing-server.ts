// Server-only provider adapters. No client-supplied price, plan or callback URL is trusted.
import {env} from 'cloudflare:workers';
import {database} from '@/db/store';
export type Provider='stripe'|'paypal'|'paynow';
type Checkout={id:string;studioId:string;owner:string;provider:Provider;amount:number;mode:string;createdAt:string;providerId?:string;subscriptionId?:string;customerId?:string;url?:string;pollUrl?:string;paidUntil?:string};
export const billingEnv=()=>env as unknown as Record<string,string|undefined>;
export function billingConfiguration(){
 const c=billingEnv(),amount=Number(c.BILLING_AMOUNT_CENTS),mode=c.BILLING_MODE;
 const base=c.BILLING_ENABLED==='true'&&c.BILLING_WEBHOOK_READY==='true'&&['test','live'].includes(mode||'')&&Number.isInteger(amount)&&amount>=100&&amount<=100000&&/^https:\/\//.test(c.BILLING_ORIGIN||'')&&!!c.BILLING_MERCHANT_NAME&&!!c.BILLING_SUPPORT_EMAIL&&(mode!=='live'||c.BILLING_LIVE_APPROVED==='true');
 const providers=[{id:'stripe' as const,name:'Stripe',recurring:true,ready:!!(base&&c.STRIPE_SECRET_KEY&&c.STRIPE_PRICE_ID&&c.STRIPE_WEBHOOK_SECRET&&c.STRIPE_SECRET_KEY.includes(mode==='live'?'_live_':'_test_'))},{id:'paypal' as const,name:'PayPal',recurring:true,ready:!!(base&&c.PAYPAL_CLIENT_ID&&c.PAYPAL_CLIENT_SECRET&&c.PAYPAL_PLAN_ID&&c.PAYPAL_WEBHOOK_ID)},{id:'paynow' as const,name:'Paynow · mobile money & cards',recurring:false,ready:!!(base&&c.PAYNOW_INTEGRATION_ID&&c.PAYNOW_INTEGRATION_KEY&&c.PAYNOW_CURRENCY==='USD'&&c.PAYNOW_MODE===mode)}];
 return {amount:Number.isInteger(amount)&&amount>=100&&amount<=100000?amount:null,currency:'USD',mode:mode==='live'?'live':'test',merchant:c.BILLING_MERCHANT_NAME||'',support:c.BILLING_SUPPORT_EMAIL||'',providers};
}
function configured(p:Provider){if(!billingConfiguration().providers.find(v=>v.id===p)?.ready)throw new Error('This payment gateway is not configured. No payment was started.');}
export function trustedUrl(value:string,hosts:string[]){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname))throw new Error('Payment provider returned an unsafe URL');return u.href;}
async function jsonFetch(url:string,init:RequestInit){const r=await fetch(url,{...init,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Payment provider could not complete the request. No subscription has been activated.');return r.json() as Promise<any>;}
async function stripe(path:string,body?:URLSearchParams,key?:string){return jsonFetch('https://api.stripe.com/v1/'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+billingEnv().STRIPE_SECRET_KEY,'Stripe-Version':'2026-07-29.dahlia',...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?.toString()});}
function paypalBase(){return billingEnv().BILLING_MODE==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';}
async function paypal(path:string,body?:unknown,key?:string){const c=billingEnv();const token=await jsonFetch(paypalBase()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+btoa(c.PAYPAL_CLIENT_ID+':'+c.PAYPAL_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});return jsonFetch(paypalBase()+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json',...(key?{'PayPal-Request-Id':key}:{})},body:body?JSON.stringify(body):undefined});}
const bytes=(v:string)=>new TextEncoder().encode(v);
const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),b=>b.toString(16).padStart(2,'0')).join('');
export function sameSecret(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
export async function paynowHash(params:URLSearchParams,key:string){return hex(await crypto.subtle.digest('SHA-512',bytes([...params].filter(([k])=>k.toLowerCase()!=='hash').map(([,v])=>v).join('')+key))).toUpperCase();}
async function paynowVerify(raw:string){const p=new URLSearchParams(raw);const value=Object.fromEntries([...p].map(([k,v])=>[k.toLowerCase(),v]));if(!value.hash||!sameSecret(value.hash.toUpperCase(),await paynowHash(p,billingEnv().PAYNOW_INTEGRATION_KEY||'')))throw new Error('Invalid payment signature');return value;}
export async function verifyStripeSignature(raw:string,signature:string,secret:string,now=Date.now()){
 const parts=signature.split(',').map(v=>v.split('='));const t=parts.find(([k])=>k==='t')?.[1];if(!t||!/^\d+$/.test(t)||Math.abs(now/1000-Number(t))>300)return false;
 const key=await crypto.subtle.importKey('raw',bytes(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const expected=hex(await crypto.subtle.sign('HMAC',key,bytes(t+'.'+raw)));return parts.some(([k,v])=>k==='v1'&&sameSecret(v,expected));
}
async function validatePlan(provider:Provider,amount:number){const c=billingEnv();if(provider==='stripe'){const p=await stripe('prices/'+encodeURIComponent(c.STRIPE_PRICE_ID!));if(!p.active||p.currency!=='usd'||p.unit_amount!==amount||p.type!=='recurring'||p.recurring?.interval!=='month'||p.recurring.interval_count!==1||p.livemode!==(c.BILLING_MODE==='live'))throw new Error('Stripe price does not match the configured monthly USD subscription');}
 if(provider==='paypal'){const p=await paypal('/v1/billing/plans/'+encodeURIComponent(c.PAYPAL_PLAN_ID!));const cycle=p.billing_cycles?.[0];if(p.status!=='ACTIVE'||p.billing_cycles?.length!==1||cycle?.total_cycles!==0||cycle?.tenure_type!=='REGULAR'||cycle.frequency?.interval_unit!=='MONTH'||cycle.frequency.interval_count!==1||cycle.pricing_scheme?.fixed_price?.currency_code!=='USD'||Math.round(Number(cycle.pricing_scheme.fixed_price.value)*100)!==amount||Number(p.payment_preferences?.setup_fee?.value||0)!==0||Number(p.taxes?.percentage||0)!==0)throw new Error('PayPal plan does not match the configured monthly USD subscription');}}
export async function startCheckout(studioId:string,owner:string,provider:Provider,id:string){
 configured(provider);const db=database(),c=billingEnv(),amount=Number(c.BILLING_AMOUNT_CENTS);
 const same=await db.prepare('SELECT * FROM billing_checkouts WHERE id=?').bind(id).first();if(same){if(same.owner!==owner||same.studio_id!==studioId||same.provider!==provider)throw new Error('Checkout identifier belongs to another request');const value=JSON.parse(same.content);if(value.url)return {id,url:value.url};throw new Error('A payment request is already being processed. Refresh its status before trying again.');}
 const account=await db.prepare('SELECT content FROM billing_accounts WHERE studio_id=?').bind(studioId).first();if(account&&new Date(JSON.parse(account.content).paidUntil).getTime()>Date.now())throw new Error('This studio already has a paid subscription term. Manage the existing subscription instead.');
 const pending=await db.prepare("SELECT id FROM billing_checkouts WHERE studio_id=? AND status IN ('creating','pending')").bind(studioId).first();if(pending)throw new Error('This studio has an unfinished checkout. Resume it or refresh its status below.');
 await validatePlan(provider,amount);
 const checkout:Checkout={id,studioId,owner,provider,amount,mode:c.BILLING_MODE!,createdAt:new Date().toISOString()};
 // The partial unique index makes simultaneous checkout attempts mutually exclusive.
 await db.prepare('INSERT INTO billing_checkouts(id,studio_id,owner,provider,status,created_at,content) VALUES(?,?,?,?,?,?,?)').bind(id,studioId,owner,provider,'creating',checkout.createdAt,JSON.stringify(checkout)).run();
 const base=new URL(c.BILLING_ORIGIN!).origin,returnUrl=base+'/subscriptions?studio='+encodeURIComponent(studioId)+'&checkout='+id;
 try{
 if(provider==='stripe'){
 const params=new URLSearchParams({mode:'subscription',integration_identifier:'sessions','line_items[0][price]':c.STRIPE_PRICE_ID!,'line_items[0][quantity]':'1',success_url:returnUrl,cancel_url:returnUrl,client_reference_id:id,'metadata[checkout_id]':id,'subscription_data[metadata][checkout_id]':id,customer_email:owner});
 const result=await stripe('checkout/sessions',params,id);checkout.providerId=result.id;checkout.url=trustedUrl(result.url,['checkout.stripe.com']);
 }else if(provider==='paypal'){
 const result=await paypal('/v1/billing/subscriptions',{plan_id:c.PAYPAL_PLAN_ID,custom_id:id,application_context:{brand_name:'Sessions',user_action:'SUBSCRIBE_NOW',return_url:returnUrl,cancel_url:returnUrl}},id);
 checkout.providerId=result.id;checkout.subscriptionId=result.id;checkout.url=trustedUrl(result.links?.find((l:any)=>l.rel==='approve')?.href,[c.BILLING_MODE==='live'?'www.paypal.com':'www.sandbox.paypal.com']);
 }else{
 const params=new URLSearchParams({id:c.PAYNOW_INTEGRATION_ID!,reference:id,amount:(amount/100).toFixed(2),additionalinfo:'Sessions studio platform subscription: 30 days, manual renewal',returnurl:returnUrl,resulturl:base+'/api/billing/webhook/paynow',authemail:owner,status:'Message'});params.append('hash',await paynowHash(params,c.PAYNOW_INTEGRATION_KEY!));
 const r=await fetch('https://www.paynow.co.zw/interface/initiatetransaction',{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params.toString()});if(!r.ok)throw new Error('Payment provider unavailable');const result=await paynowVerify(await r.text());if(result.status.toLowerCase()!=='ok')throw new Error('Paynow could not start the payment');checkout.url=trustedUrl(result.browserurl,['www.paynow.co.zw']);checkout.pollUrl=trustedUrl(result.pollurl,['www.paynow.co.zw']);
 }
 await db.prepare("UPDATE billing_checkouts SET status='pending',content=? WHERE id=?").bind(JSON.stringify(checkout),id).run();return {id,url:checkout.url};
 }catch{
 // A timeout may have created an upstream checkout. Keep this locked for reconciliation,
 // instead of creating a second subscription with a different key.
 throw new Error('Checkout could not be completed. The request is retained for reconciliation; do not pay twice. Contact the platform operator with reference '+id);
 }
}
export async function reconcileCheckout(id:string){
 const db=database(),row=await db.prepare('SELECT * FROM billing_checkouts WHERE id=?').bind(id).first();if(!row)throw new Error('Checkout not found');const x:Checkout=JSON.parse(row.content);configured(x.provider);if(x.mode!==billingEnv().BILLING_MODE)throw new Error('Checkout belongs to a different payment mode');
 let status='pending',paidUntil:string|undefined,customerId=x.customerId;
 if(x.provider==='stripe'){
 if(!x.providerId)throw new Error('Checkout requires operator reconciliation');
 const session=await stripe('checkout/sessions/'+encodeURIComponent(x.providerId));if(session.client_reference_id!==x.id||session.metadata?.checkout_id!==x.id||session.livemode!==(x.mode==='live'))throw new Error('Checkout identity mismatch');
 if(session.status==='expired')status='expired';
 if(session.subscription){const sub=await stripe('subscriptions/'+encodeURIComponent(session.subscription)+'?expand%5B%5D=latest_invoice');const item=sub.items?.data?.[0];const invoice=sub.latest_invoice;
 if(sub.metadata?.checkout_id!==x.id||item?.price?.id!==billingEnv().STRIPE_PRICE_ID||item.price.unit_amount!==x.amount||item.quantity!==1||sub.items.data.length!==1||invoice?.currency!=='usd')throw new Error('Subscription price mismatch');
 x.subscriptionId=sub.id;customerId=typeof sub.customer==='string'?sub.customer:sub.customer.id;
 if(invoice.status==='paid'&&invoice.amount_paid>=x.amount&&['active','canceled'].includes(sub.status)){paidUntil=new Date((item.current_period_end||sub.current_period_end)*1000).toISOString();status=sub.cancel_at_period_end||sub.status==='canceled'?'cancelled':'active';}else if(['canceled','unpaid','past_due','incomplete_expired'].includes(sub.status))status=sub.status;
 }
 }else if(x.provider==='paypal'){
 if(!x.providerId)throw new Error('Checkout requires operator reconciliation');const sub=await paypal('/v1/billing/subscriptions/'+encodeURIComponent(x.providerId));if(sub.custom_id!==x.id||sub.plan_id!==billingEnv().PAYPAL_PLAN_ID)throw new Error('Subscription identity mismatch');
 const last=sub.billing_info?.last_payment;if(['ACTIVE','CANCELLED','SUSPENDED'].includes(sub.status)&&last?.amount?.currency_code==='USD'&&Math.round(Number(last.amount.value)*100)===x.amount){const paid=new Date(last.time);const day=paid.getUTCDate();paid.setUTCDate(1);paid.setUTCMonth(paid.getUTCMonth()+1);const lastDay=new Date(Date.UTC(paid.getUTCFullYear(),paid.getUTCMonth()+1,0)).getUTCDate();paid.setUTCDate(Math.min(day,lastDay));paidUntil=sub.billing_info.next_billing_time||paid.toISOString();status=sub.status==='ACTIVE'?'active':'cancelled';}else if(['CANCELLED','EXPIRED','SUSPENDED'].includes(sub.status))status='cancelled';
 }else{
 if(!x.pollUrl)throw new Error('Checkout requires operator reconciliation');const r=await fetch(trustedUrl(x.pollUrl,['www.paynow.co.zw']),{method:'POST',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Paynow status unavailable');const value=await paynowVerify(await r.text());if(value.reference!==id||Math.round(Number(value.amount)*100)!==x.amount)throw new Error('Payment reference or amount mismatch');
 if(['paid','delivered'].includes(value.status.toLowerCase())){status='active';paidUntil=x.paidUntil||new Date(Date.now()+30*86400000).toISOString();}else if(['cancelled','refunded','disputed'].includes(value.status.toLowerCase()))status=value.status.toLowerCase();
 }
 const guard=crypto.randomUUID();x.customerId=customerId;if(paidUntil)x.paidUntil=paidUntil;
 const steps:any[]=[db.prepare('INSERT INTO operation_guards(id,valid) VALUES(?,(SELECT CASE WHEN content=? THEN 1 ELSE 0 END FROM billing_checkouts WHERE id=?))').bind(guard,row.content,id),db.prepare('UPDATE billing_checkouts SET status=?,content=? WHERE id=?').bind(status,JSON.stringify(x),id)];
 if(paidUntil||!['creating','pending','expired'].includes(status)){
 const account={checkoutId:id,studioId:x.studioId,provider:x.provider,mode:x.mode,status,paidUntil:paidUntil||'',customerId:customerId||'',subscriptionId:x.subscriptionId||x.providerId||'',updatedAt:new Date().toISOString()};
 // A late event for an old checkout must never replace a newer subscription.
 steps.push(db.prepare("INSERT INTO billing_accounts(studio_id,content) VALUES(?,?) ON CONFLICT(studio_id) DO UPDATE SET content=excluded.content WHERE json_extract(billing_accounts.content,'$.checkoutId')=? OR json_extract(billing_accounts.content,'$.paidUntil') < ?").bind(x.studioId,JSON.stringify(account),id,paidUntil||''));
 }
 steps.push(db.prepare('DELETE FROM operation_guards WHERE id=?').bind(guard));await db.batch(steps);return {status,paidUntil:paidUntil||null};
}
export async function billingPortal(studioId:string){const row=await database().prepare('SELECT content FROM billing_accounts WHERE studio_id=?').bind(studioId).first();if(!row)throw new Error('No subscription found');const a=JSON.parse(row.content),base=new URL(billingEnv().BILLING_ORIGIN!).origin;if(a.mode!==billingEnv().BILLING_MODE)throw new Error('Subscription belongs to a different payment mode');if(a.provider==='stripe'){configured('stripe');const p=await stripe('billing_portal/sessions',new URLSearchParams({customer:a.customerId,return_url:base+'/subscriptions?studio='+studioId}),crypto.randomUUID());return trustedUrl(p.url,['billing.stripe.com']);}if(a.provider==='paypal')return billingEnv().BILLING_MODE==='live'?'https://www.paypal.com/myaccount/autopay/':'https://www.sandbox.paypal.com/myaccount/autopay/';throw new Error('Paynow terms do not auto-renew. No recurring agreement needs cancellation.');}
export async function processBillingWebhook(provider:Provider,req:Request){
 configured(provider);const raw=await req.text();if(raw.length>200000)throw new Error('Payload too large');let id='',eventId='';
 if(provider==='stripe'){
 if(!await verifyStripeSignature(raw,req.headers.get('stripe-signature')||'',billingEnv().STRIPE_WEBHOOK_SECRET!))throw new Error('Invalid webhook signature');const event=JSON.parse(raw);if(event.livemode!==(billingEnv().BILLING_MODE==='live'))throw new Error('Wrong webhook mode');eventId=event.id;id=event.data?.object?.metadata?.checkout_id||'';
 const invoiceSubscription=event.data?.object?.subscription||event.data?.object?.parent?.subscription_details?.subscription;if(!id&&invoiceSubscription){const row=await database().prepare("SELECT id FROM billing_checkouts WHERE provider='stripe' AND json_extract(content,'$.subscriptionId')=?").bind(invoiceSubscription).first();id=row?.id||'';}
 }else if(provider==='paypal'){
 const event=JSON.parse(raw);const result=await paypal('/v1/notifications/verify-webhook-signature',{auth_algo:req.headers.get('paypal-auth-algo'),cert_url:req.headers.get('paypal-cert-url'),transmission_id:req.headers.get('paypal-transmission-id'),transmission_sig:req.headers.get('paypal-transmission-sig'),transmission_time:req.headers.get('paypal-transmission-time'),webhook_id:billingEnv().PAYPAL_WEBHOOK_ID,webhook_event:event});if(result.verification_status!=='SUCCESS')throw new Error('Invalid webhook signature');eventId=event.id;id=event.resource?.custom_id||'';if(!id){const providerId=event.resource?.billing_agreement_id||event.resource?.id;const row=await database().prepare("SELECT id FROM billing_checkouts WHERE provider='paypal' AND json_extract(content,'$.providerId')=?").bind(providerId||'').first();id=row?.id||'';}
 }else{const value=await paynowVerify(raw);id=value.reference||'';eventId=hex(await crypto.subtle.digest('SHA-256',bytes(raw)));}
 if(!id)return;
 const row=await database().prepare('SELECT provider FROM billing_checkouts WHERE id=?').bind(id).first();if(!row||row.provider!==provider)return;
 const seen=await database().prepare('SELECT id FROM billing_events WHERE provider=? AND id=?').bind(provider,eventId).first();if(seen)return;
 await reconcileCheckout(id);await database().prepare('INSERT OR IGNORE INTO billing_events(provider,id) VALUES(?,?)').bind(provider,eventId).run();
}
