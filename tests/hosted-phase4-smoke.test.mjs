import test from 'node:test';
import assert from 'node:assert/strict';

const origin='https://sessions-music.kudzimusar.chatgpt.site';
async function page(path){
 const response=await fetch(origin+path,{redirect:'follow',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Sessions-Phase4-Deployment-Smoke/1.0'}});
 const text=await response.text();
 assert.ok(response.status>=200&&response.status<500,`${path} returned ${response.status}`);
 return {response,text};
}

test('hosted mobile route serves the promoted production registry rather than the old demo',async()=>{
 const {response,text}=await page('/mobile');
 assert.equal(response.status,200);
 assert.match(text,/Find your sound|Explore studios|Building Harare’s music-space registry/i);
 assert.doesNotMatch(text,/fictional sample marketplace|demo workspace/i);
});

test('hosted corporate route resolves the Phase 4 deny-by-default authority boundary',async()=>{
 const {response,text}=await page('/corporate');
 assert.equal(response.status,200);
 assert.match(text,/Checking account authority|Sign in required|SESSIONS CORPORATE|Company control centre/i);
 assert.doesNotMatch(text,/fictional sample marketplace|demo workspace/i);
});
