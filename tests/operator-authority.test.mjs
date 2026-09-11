import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-operator-authority-'));
globalThis.__operatorAuthority={env:{SESSIONS_ADMIN_EMAILS:'legacy-admin@example.test'}};
const plugin={name:'operator-authority-fixture',setup(bundle){bundle.onResolve({filter:/cloudflare:workers/},()=>({path:'runtime',namespace:'fixture'}));bundle.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const env=globalThis.__operatorAuthority.env;',loader:'js'}))}};
await build({entryPoints:[resolve('db/registry-store.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'store.mjs'),plugins:[plugin],logLevel:'silent'});
const{isRegistryUserOperator}=await import(pathToFileURL(join(temp,'store.mjs')));

test('legacy configured admin email remains available only to the ChatGPT preview identity',()=>{
 assert.equal(isRegistryUserOperator({email:'legacy-admin@example.test',roles:['musician'],method:'chatgpt_demo'}),true);
 assert.equal(isRegistryUserOperator({email:'legacy-admin@example.test',roles:['musician'],method:'email_otp'}),false);
 assert.equal(isRegistryUserOperator({email:'legacy-admin@example.test',roles:['musician'],method:'phone_otp'}),false);
});

test('production Operations authority comes from the trusted platform role',()=>{
 assert.equal(isRegistryUserOperator({email:'ordinary@example.test',roles:['musician','operations_admin'],method:'email_otp'}),true);
 assert.equal(isRegistryUserOperator({email:'ordinary@example.test',roles:['musician','finance_admin'],method:'email_otp'}),false);
 assert.equal(isRegistryUserOperator({email:'ordinary@example.test',roles:['musician','trust_safety'],method:'email_otp'}),false);
});

after(()=>{rmSync(temp,{recursive:true,force:true});delete globalThis.__operatorAuthority});
