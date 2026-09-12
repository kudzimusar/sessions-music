import test from 'node:test';
import assert from 'node:assert/strict';

const origin='https://sessions-music.kudzimusar.chatgpt.site';

test('public Sessions Site serves the current Phase 4 deployment marker',async()=>{
 const response=await fetch(origin+'/api/release',{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Sessions-Deployment-Verification/1.0','Cache-Control':'no-cache'}});
 const text=await response.text();
 assert.equal(response.status,200,`expected /api/release 200; got ${response.status}: ${text.slice(0,300)}`);
 const payload=JSON.parse(text);
 assert.equal(payload.id,'unified-platform-v1-phase4');
 assert.equal(payload.phase,4);
 assert.equal(payload.brandPrimary,'#4169E1');
});
