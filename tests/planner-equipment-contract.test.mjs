import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {AI_DISCOVERY_CONTRACT,AI_DISCOVERY_EQUIPMENT} from '../packages/product-core/index.js';

const temp=mkdtempSync(join(tmpdir(),'sessions-planner-equipment-'));
const bundle=join(temp,'discovery.mjs');
await build({entryPoints:[resolve('lib/discovery.ts')],bundle:true,platform:'node',format:'esm',outfile:bundle,logLevel:'silent'});
const discovery=await import(pathToFileURL(bundle));
after(()=>rmSync(temp,{recursive:true,force:true}));
const read=path=>readFileSync(path,'utf8');

const room={id:'room',name:'Live Room',price:2000,capacity:8,open:600,close:900,days:[0,1,2,3,4,5,6],buffer:0,minimum:60};
const studio={id:'studio',name:'Published Rehearsal Room',area:'Borrowdale',address:'Borrowdale, Harare',category:'Rehearsal studio',services:['Rehearsal'],description:'Test',website:'',phone:'',email:'',sources:[],status:'bookable',bookingEnabled:true,rooms:[room],equipment:'Pearl drum kit, PA speakers and mixer, vocal microphones, bass amp combo and guitar amps',rules:'',location:null,revision:1};
const future=new Date(Date.now()+2*86400000).toLocaleDateString('en-CA',{timeZone:'Africa/Harare'});
const input={date:future,start:null,duration:60,size:4,budget:5000,area:'Borrowdale',service:'Rehearsal',equipment:['drums','pa'],flexDays:0};

test('shared AI contract explicitly preserves editable music-equipment requirements',()=>{
  assert.ok(AI_DISCOVERY_CONTRACT.fields.includes('equipment'));
  assert.deepEqual(AI_DISCOVERY_CONTRACT.equipment,AI_DISCOVERY_EQUIPMENT);
  assert.ok(AI_DISCOVERY_EQUIPMENT.includes('drums'));
  assert.ok(AI_DISCOVERY_EQUIPMENT.includes('pa'));
  assert.equal(AI_DISCOVERY_CONTRACT.mayBook,false);
  assert.equal(AI_DISCOVERY_CONTRACT.mayInventMarketplaceFacts,false);
});

test('canonical planner rejects studios whose published equipment does not satisfy the interpreted requirements',()=>{
  assert.equal(discovery.studioMeetsEquipment(studio,['drums','pa']),true);
  assert.equal(discovery.studioMeetsEquipment(studio,['piano']),false);
  const matching=discovery.planSessions([studio],[],[],input);
  assert.ok(matching.length>0);
  assert.deepEqual(discovery.planSessions([studio],[],[],{...input,equipment:['piano']}),[]);
});

test('planner API extracts bounded equipment without breaking older guided clients',()=>{
  const route=read('app/api/planner/route.ts');
  assert.match(route,/equipment:equipmentSchema\.default\(\[\]\)/);
  assert.match(route,/equipment:\{type:\['array','null'\]/);
  assert.match(route,/enum:\[\.\.\.PLANNER_EQUIPMENT\]/);
  assert.match(route,/Never invent prices, capacities, equipment availability, verification/);
});

test('web and native planners both expose equipment as editable user-visible constraints',()=>{
  const web=read('app/session-planner.tsx');
  const native=read('native/sessions-native/app/planner.js');
  const api=read('native/sessions-native/src/api.js');
  assert.match(web,/Required equipment/);
  assert.match(web,/PLANNER_EQUIPMENT\.map/);
  assert.match(native,/MUSIC-SPECIFIC FIT/);
  assert.match(native,/AI_DISCOVERY_EQUIPMENT/);
  assert.match(native,/accessibilityRole="checkbox"/);
  assert.match(api,/equipment:Array\.isArray\(body\?\.equipment\)/);
});
