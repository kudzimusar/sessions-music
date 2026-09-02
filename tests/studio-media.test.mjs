import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {build} from 'esbuild';
import {readFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-media-test-')),sql=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(value=>value.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{constructor(query){this.query=query;this.params=[]}bind(...params){this.params=params;return this}async first(){return sql.prepare(this.query).get(...this.params)??null}async all(){return {results:sql.prepare(this.query).all(...this.params)}}async run(){return sql.prepare(this.query).run(...this.params)}}
const db={prepare:query=>new Statement(query),async batch(steps){sql.exec('BEGIN');try{const results=steps.map(step=>sql.prepare(step.query).run(...step.params));sql.exec('COMMIT');return results}catch(error){sql.exec('ROLLBACK');throw error}}};
const objects=new Map();const bucket={async put(id,bytes){objects.set(id,bytes)},async get(id){const value=objects.get(id);return value?{body:value}:null},async delete(id){objects.delete(id)}};
globalThis.__media={env:{DB:db,BUCKET:bucket,SESSIONS_ADMIN_EMAILS:'operator@example.test'},user:null};
const plugin={name:'media-fixture',setup(bundle){bundle.onResolve({filter:/cloudflare:workers/},()=>({path:'runtime',namespace:'fixture'}));bundle.onResolve({filter:/chatgpt-auth/},()=>({path:'auth',namespace:'fixture'}));bundle.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='auth'?"export const getProductionUser=async()=>{const user=globalThis.__media.user;return user?{id:user.email,displayName:'Fixture',email:user.email,phone:null,roles:user.email==='operator@example.test'?['musician','operations_admin']:['musician'],memberships:[],method:'chatgpt_demo',sessionId:'test'}:null};":'export const env=globalThis.__media.env;',loader:'js'}))}};
await build({entryPoints:{upload:resolve('app/api/upload/route.ts'),media:resolve('app/api/media/[id]/route.ts')},bundle:true,platform:'node',format:'esm',outdir:temp,plugins:[plugin],logLevel:'silent'});
const upload=await import(pathToFileURL(join(temp,'upload.js'))),media=await import(pathToFileURL(join(temp,'media.js')));
const studio={id:'fixture-studio',name:'Fixture Studio',area:'Harare',address:'Fixture address',category:'Rehearsal studio',services:['Rehearsal'],description:'Fixture studio for private media authorization tests.',website:'',phone:'',email:'',sources:[],status:'claimed',bookingEnabled:false,rooms:[{id:'room-1',name:'Room 1',price:1000,capacity:5,open:540,close:1080,days:[1],buffer:30,minimum:60,photos:[]}],equipment:'',rules:'',location:null,revision:0};
sql.prepare('INSERT INTO studio_registry(id,owner,content) VALUES(?,?,?)').run(studio.id,'owner@example.test',JSON.stringify(studio));
const identity=email=>{globalThis.__media.user=email?{email}:null};
const image=()=>new File([new Uint8Array([137,80,78,71,13,10,26,10])],'room.png',{type:'image/png'});
const request=(purpose,origin='https://sessions.test')=>{const form=new FormData();form.set('file',image());form.set('purpose',purpose);form.set('studioId',studio.id);if(purpose==='studio_room_photo')form.set('roomId','room-1');return new Request('https://sessions.test/api/upload',{method:'POST',headers:{Origin:origin},body:form})};
const open=id=>media.GET(new Request('https://sessions.test/api/media/'+id),{params:Promise.resolve({id})});

test('studio media upload requires identity, same origin and exact owner tenancy',async()=>{identity(null);assert.equal((await upload.POST(request('studio_room_photo'))).status,401);identity('owner@example.test');assert.equal((await upload.POST(request('studio_room_photo','https://hostile.test'))).status,403);identity('outsider@example.test');assert.equal((await upload.POST(request('studio_room_photo'))).status,403)});
test('image signature is checked before R2 or D1 persistence',async()=>{identity('owner@example.test');const form=new FormData();form.set('file',new File([new Uint8Array([0,1,2,3])],'fake.png',{type:'image/png'}));form.set('purpose','studio_room_photo');form.set('studioId',studio.id);form.set('roomId','room-1');const response=await upload.POST(new Request('https://sessions.test/api/upload',{method:'POST',headers:{Origin:'https://sessions.test'},body:form}));assert.equal(response.status,400);assert.equal(sql.prepare('SELECT count(*) n FROM uploads').get().n,0)});
test('room photos are private until referenced by the saved room, then become public',async()=>{identity('owner@example.test');const response=await upload.POST(request('studio_room_photo'));assert.equal(response.status,200);const result=await response.json();identity(null);assert.equal((await open(result.id)).status,404);studio.rooms[0].photos=[result.url];sql.prepare('UPDATE studio_registry SET content=? WHERE id=?').run(JSON.stringify(studio),studio.id);const publicPhoto=await open(result.id);assert.equal(publicPhoto.status,200);assert.match(publicPhoto.headers.get('cache-control'),/^public/)});
test('verification images stay private to the studio owner and Operations',async()=>{identity('owner@example.test');const response=await upload.POST(request('studio_verification'));assert.equal(response.status,200);const result=await response.json();identity('outsider@example.test');assert.equal((await open(result.id)).status,404);identity('owner@example.test');assert.equal((await open(result.id)).status,200);identity('operator@example.test');assert.equal((await open(result.id)).status,200)});

after(()=>{sql.close();rmSync(temp,{recursive:true,force:true});delete globalThis.__media});
