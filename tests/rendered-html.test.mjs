import assert from 'node:assert/strict';
import test,{after,before} from 'node:test';
import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const runtime=new Miniflare({modules:true,scriptPath:resolve('dist/server/index.js'),compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],d1Databases:['DB'],r2Buckets:['BUCKET'],serviceBindings:{ASSETS:async()=>new Response('Not found',{status:404})}});
const workerEmail='worker-fixture@example.test';
const headersFor=email=>({'oai-authenticated-user-email':email});
const authHeaders=headersFor(workerEmail);
let db;

async function applyMigrations(){
 db=await runtime.getD1Database('DB');
 for(const file of (await readdir('drizzle')).filter(value=>value.endsWith('.sql')).sort()){
  const sql=await readFile(resolve('drizzle',file),'utf8');
  for(const statement of sql.split('--> statement-breakpoint').filter(value=>value.trim()))await db.prepare(statement).run();
 }
}

async function onboardingAction(email,payload){
 const response=await runtime.dispatchFetch('https://sessions.test/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://sessions.test',...headersFor(email)},body:JSON.stringify(payload)});
 const body=await response.json();
 assert.equal(response.status,200,`onboarding ${payload.action} failed: ${JSON.stringify(body)}`);
 return body;
}

async function activateCustomer(email){
 await onboardingAction(email,{action:'completeProfile',displayName:'Worker Fixture',market:'ZW',locale:'en-ZW'});
 await onboardingAction(email,{action:'recordConsent',consentType:'terms',granted:true,idempotencyKey:`terms-${email}`,channel:'web'});
 const active=await onboardingAction(email,{action:'recordConsent',consentType:'privacy',granted:true,idempotencyKey:`privacy-${email}`,channel:'web'});
 assert.equal(active.profile.status,'active');
 assert.equal(active.consents.terms,true);
 assert.equal(active.consents.privacy,true);
 assert.equal(active.nextStep,'ready');
}

before(async()=>{await applyMigrations();await activateCustomer(workerEmail)});
after(()=>runtime.dispose());

test('anonymous protected surfaces fail closed into sign-in without leaking marketplace data',async()=>{
 for(const path of ['/mobile','/planner','/register']){
  const response=await runtime.dispatchFetch('https://sessions.test'+path);
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/data-sessions-surface="onboarding-public"/);
  assert.match(html,/Sign in to continue/);
  assert.doesNotMatch(html,/OneVibe Studiox/);
  assert.doesNotMatch(html,/CUSTOMER-PRIVATE/);
 }
 const registry=await runtime.dispatchFetch('https://sessions.test/api/registry');
 assert.notEqual(registry.status,200);
 const body=await registry.text();
 assert.doesNotMatch(body,/OneVibe Studiox/);
 assert.doesNotMatch(body,/"studios"/);
});

test('authenticated identities must finish profile and consent onboarding before marketplace access',async()=>{
 const headers=headersFor('profile-required@example.test');
 const response=await runtime.dispatchFetch('https://sessions.test/mobile',{headers});
 assert.equal(response.status,200);
 const html=await response.text();
 assert.match(html,/data-sessions-surface="onboarding"/);
 assert.match(html,/How should Sessions address you\?/);
 assert.match(html,/ONE SESSIONS IDENTITY/);
 assert.doesNotMatch(html,/data-sessions-surface="customer-v5"/);
});

test('activated production Worker opens on desktop PWA customer home while sourced inventory remains canonical',async()=>{
 const response=await runtime.dispatchFetch('https://sessions.test/',{headers:authHeaders});assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/^text\/html/);const html=await response.text();assert.match(html,/<title>Sessions<\/title>/);assert.match(html,/class="registry-app/);assert.match(html,/Find your sound/);assert.match(html,/OneVibe Studiox/);assert.doesNotMatch(html,/data-sessions-surface="customer-native"/);assert.doesNotMatch(html,/name="codex-preview"/);assert.doesNotMatch(html,/The Live Room/);
 const directory=await runtime.dispatchFetch('https://sessions.test/studios',{headers:authHeaders});assert.equal(directory.status,200);const directoryHtml=await directory.text();assert.match(directoryHtml,/OneVibe Studiox/);assert.match(directoryHtml,/Unclaimed profile/);assert.doesNotMatch(directoryHtml,/The Live Room/);
});

test('production API enforces identity and persists reservations in D1',async()=>{
 const anonymousRegistry=await runtime.dispatchFetch('https://sessions.test/api/registry');assert.notEqual(anonymousRegistry.status,200);assert.doesNotMatch(await anonymousRegistry.text(),/OneVibe Studiox/);
 const registry=await runtime.dispatchFetch('https://sessions.test/api/registry',{headers:authHeaders});assert.equal(registry.status,200);const visibleStudios=(await registry.json()).studios;assert.equal(visibleStudios.length,12);assert.equal(visibleStudios.filter(s=>s.publicLocation).length,4);assert.ok(visibleStudios.every(s=>s.location===null));
 const unauth=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'favorite',id:'the-live-room'})});assert.equal(unauth.status,401);
 const headers={'Content-Type':'application/json',...authHeaders};
 const first=await runtime.dispatchFetch('https://sessions.test/api/state',{headers});assert.equal(first.status,200);const initial=await first.json();assert.equal(initial.rooms.length,10);assert.equal(initial.bookings.length,0);
 const date=new Date(Date.now()+14*86400000).toISOString().slice(0,10);const payload={type:'book',roomId:'the-live-room',date,start:600,duration:60,weeks:1,groupName:'Worker runtime test band',groupSize:4,key:crypto.randomUUID()};
 const booked=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(booked.status,200);const b=await booked.json();assert.equal(b.booking.total,1980);
 const restored=await(await runtime.dispatchFetch('https://sessions.test/api/state',{headers})).json();assert.equal(restored.bookings[0].id,b.booking.id);
 const conflict=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers,body:JSON.stringify({...payload,key:crypto.randomUUID()})});assert.equal(conflict.status,409);
 const other=await(await runtime.dispatchFetch('https://sessions.test/api/state',{headers:{...headers,'oai-authenticated-user-email':'other-worker-fixture@example.test'}})).json();assert.equal(other.bookings.length,0);
});

test('activated production Worker renders native mobile home while desktop map and studio detail remain available',async()=>{
 const mobile=await runtime.dispatchFetch('https://sessions.test/mobile',{headers:authHeaders});assert.equal(mobile.status,200);const phone=await mobile.text();assert.match(phone,/data-sessions-surface="customer-native"/);assert.match(phone,/cn-home-screen/);assert.match(phone,/Spaces for your sound/);assert.match(phone,/cn-tabbar/);assert.doesNotMatch(phone,/phone-mode/);
 for(const [path,pattern]of [['/map',/Approximate building location · entrance unconfirmed/],['/studio/onevibe-studiox',/Where this profile comes from/],['/demo',/Fictional rehearsal inventory/]]){const r=await runtime.dispatchFetch('https://sessions.test'+path,{headers:authHeaders});assert.equal(r.status,200);assert.match(await r.text(),pattern);}
});

test('activated production Worker exposes planner, registration, capacity and visible payment states',async()=>{
 for(const [path,pattern] of [['/planner',/Guided planner/],['/register',/My studio is missing/],['/subscriptions',/Price not set/],['/onboarding/onevibe-studiox',/OneVibe Studiox|Sign in to continue/],['/studio/onevibe-studiox',/Capacity not supplied/]]){const r=await runtime.dispatchFetch('https://sessions.test'+path,{headers:authHeaders});assert.equal(r.status,200);assert.match(await r.text(),pattern);}
 const planner=await runtime.dispatchFetch('https://sessions.test/api/planner',{headers:authHeaders});assert.equal(planner.status,200);assert.equal((await planner.json()).aiReady,false);
 const billing=await runtime.dispatchFetch('https://sessions.test/api/billing',{headers:authHeaders});assert.equal(billing.status,200);const value=await billing.json();assert.equal(value.amount,null);assert.ok(value.providers.every(p=>!p.ready));
 const registrationEmail='registration-worker@example.test';
 await activateCustomer(registrationEmail);
 const registration=await runtime.dispatchFetch('https://sessions.test/api/registry',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://sessions.test',...headersFor(registrationEmail)},body:JSON.stringify({type:'registerStudio',name:'Worker registration fixture',area:'Harare',address:'Fixture business address in Harare',category:'Rehearsal studio',description:'A fixture business created only inside the isolated production Worker test.',website:'https://example.test/fixture',phone:'+263000000000',representative:'Fixture owner',evidence:'Independent business channel evidence for the Worker fixture application.',consent:true})});assert.equal(registration.status,200);assert.equal((await registration.json()).registration.status,'pending');
 const viewer=await(await runtime.dispatchFetch('https://sessions.test/api/registry',{headers:authHeaders})).json();assert.deepEqual(viewer.registrations,[]);assert.deepEqual(viewer.memberships,[]);assert.equal(viewer.studios.length,12);
});

test('activated studio sharing metadata matches visible records and never inherits generic studio imagery',async()=>{
 const registry=await(await runtime.dispatchFetch('https://sessions.test/api/registry',{headers:authHeaders})).json();
 for(const id of ['onevibe-studiox','bridgenorth-studios']){
  const studio=registry.studios.find(s=>s.id===id);
  const html=await(await runtime.dispatchFetch('https://sessions.test/studio/'+id,{headers:authHeaders})).text();
  assert.ok(html.includes('<title>'+studio.name+' | Sessions</title>'));
  assert.ok(html.includes('property="og:title" content="'+studio.name+' | Sessions"'));
  assert.ok(html.includes('name="twitter:title" content="'+studio.name+' | Sessions"'));
  assert.ok(html.includes('name="description" content="'+studio.description+'"'));
  assert.doesNotMatch(html,/<meta[^>]+(?:property="og:image"|name="twitter:image")/);
 }
 const id='metro-studios';
 await db.prepare("UPDATE studio_registry SET content=json_set(content,'$.hidden',json('true')) WHERE id=?").bind(id).run();
 const hidden=await(await runtime.dispatchFetch('https://sessions.test/studio/'+id,{headers:authHeaders})).text();
 assert.match(hidden,/<title>Studio unavailable \| Sessions<\/title>/);
 assert.doesNotMatch(hidden,/9 Williams Way/);
});
