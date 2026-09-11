import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-search-'));
await build({entryPoints:[resolve('lib/domain.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'domain.js'),logLevel:'silent'});
const domain=await import(pathToFileURL(join(temp,'domain.js')));
after(()=>rmSync(temp,{recursive:true,force:true}));

test('interprets a music-specific rehearsal request into editable marketplace constraints',()=>{
 const parsed=domain.parseSearch('Four-piece gospel band, Saturday 2pm in Borrowdale, drums and PA, parking, backup power, under US$25','2026-09-11');
 assert.equal(parsed.area,'Borrowdale');
 assert.equal(parsed.capacity,4);
 assert.equal(parsed.date,'2026-09-12');
 assert.equal(parsed.time,'840');
 assert.equal(parsed.budget,25);
 assert.equal(parsed.category,'Full band');
 assert.equal(parsed.backup,true);
 assert.equal(parsed.parking,true);
 assert.deepEqual(parsed.equipment,['Drum kit','PA system']);
});

test('understands booking model, accessibility, verification and duration language',()=>{
 const parsed=domain.parseSearch('Verified step-free studio with instant booking, guitar amps and mics, 90 minutes tomorrow evening','2026-09-11');
 assert.equal(parsed.bookingMode,'instant');
 assert.equal(parsed.accessible,true);
 assert.equal(parsed.verified,true);
 assert.equal(parsed.duration,90);
 assert.equal(parsed.date,'2026-09-12');
 assert.equal(parsed.time,'evening');
 assert.ok(parsed.equipment.includes('Guitar amps'));
 assert.ok(parsed.equipment.includes('Vocal microphones'));
});

test('recognises approval-only institutional rehearsal requirements',()=>{
 const parsed=domain.parseSearch('Choir of 20 at a church, provider approval, piano, music stands, flexible cancellation','2026-09-11');
 assert.equal(parsed.capacity,20);
 assert.equal(parsed.bookingMode,'approval');
 assert.equal(parsed.category,'Choirs & worship');
 assert.equal(parsed.cancellation,true);
 assert.ok(parsed.equipment.includes('Piano'));
 assert.ok(parsed.equipment.includes('Music stands'));
});
