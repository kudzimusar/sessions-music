import assert from 'node:assert/strict';
import test,{after} from 'node:test';
import {Miniflare} from 'miniflare';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const runtime=new Miniflare({modules:true,scriptPath:resolve('dist/server/index.js'),compatibilityDate:'2026-05-22',compatibilityFlags:['nodejs_compat'],modulesRules:[{type:'ESModule',include:['**/*.js'],fallthrough:true}],d1Databases:['DB'],r2Buckets:['BUCKET'],serviceBindings:{ASSETS:async()=>new Response('Not found',{status:404})}});
after(()=>runtime.dispose());
test('production Worker renders Sessions title and room inventory without starter metadata',async()=>{const response=await runtime.dispatchFetch('https://sessions.test/');assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/^text\/html/);const html=await response.text();assert.match(html,/<title>Sessions<\/title>/);assert.match(html,/Find your next session/);assert.doesNotMatch(html,/name="codex-preview"/);assert.match(html,/Sample venue/)});
test('production API enforces identity and persists reservations in D1',async()=>{const db=await runtime.getD1Database('DB');for(const file of ['0000_premium_charles_xavier.sql','0001_violet_angel.sql']){const sql=await readFile(resolve('drizzle',file),'utf8');for(const statement of sql.split('--> statement-breakpoint').filter(x=>x.trim()))await db.prepare(statement).run();}
 const unauth=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'favorite',id:'the-live-room'})});assert.equal(unauth.status,401);
 const headers={'Content-Type':'application/json','oai-authenticated-user-email':'worker-fixture@example.test'};
 const first=await runtime.dispatchFetch('https://sessions.test/api/state',{headers});assert.equal(first.status,200);const initial=await first.json();assert.equal(initial.rooms.length,10);assert.equal(initial.bookings.length,0);
 const date=new Date(Date.now()+14*86400000).toISOString().slice(0,10);const payload={type:'book',roomId:'the-live-room',date,start:600,duration:60,weeks:1,groupName:'Worker runtime test band',groupSize:4,key:crypto.randomUUID()};
 const booked=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(booked.status,200);const b=await booked.json();assert.equal(b.booking.total,1980);
 const restored=await(await runtime.dispatchFetch('https://sessions.test/api/state',{headers})).json();assert.equal(restored.bookings[0].id,b.booking.id);
 const conflict=await runtime.dispatchFetch('https://sessions.test/api/action',{method:'POST',headers,body:JSON.stringify({...payload,key:crypto.randomUUID()})});assert.equal(conflict.status,409);
 const other=await(await runtime.dispatchFetch('https://sessions.test/api/state',{headers:{...headers,'oai-authenticated-user-email':'other-worker-fixture@example.test'}})).json();assert.equal(other.bookings.length,0);
});
