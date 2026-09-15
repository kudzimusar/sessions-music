import {spawn} from 'node:child_process';

const parseDuration = value => {
  const match = /^(\d+)(ms|s|m|h)$/.exec(value || '');
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  return amount * ({ms:1,s:1000,m:60000,h:3600000}[match[2]]);
};

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error('A command is required');

const timeoutMs = parseDuration(process.env.SITES_BUILD_TIMEOUT || '3m');
const killAfterMs = parseDuration(process.env.SITES_BUILD_KILL_AFTER || '10s');
const child = spawn(command, args, {stdio:'inherit', env:process.env});
let hardTimer;
const softTimer = setTimeout(() => {
  child.kill('SIGTERM');
  hardTimer = setTimeout(() => child.kill('SIGKILL'), killAfterMs);
}, timeoutMs);

child.once('exit', (code, signal) => {
  clearTimeout(softTimer);
  clearTimeout(hardTimer);
  process.exit(signal ? 124 : (code ?? 1));
});
