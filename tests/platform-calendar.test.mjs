import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const temp=mkdtempSync(join(tmpdir(),'sessions-calendar-'));
await build({entryPoints:[resolve('lib/platform-calendar.ts')],bundle:true,platform:'node',format:'esm',outfile:join(temp,'calendar.mjs'),logLevel:'silent'});
const calendar=await import(pathToFileURL(join(temp,'calendar.mjs')));
const studio={id:'studio-1',name:'Fixture Studio',address:'1 Music Road, Harare'};
const booking={id:'RS-private-fixture',studioId:'studio-1',roomId:'room-1',roomName:'Main room',customer:'private@example.test',name:'Private Customer',phone:'+263-private',date:'2026-09-10',start:540,duration:90,size:6,note:'Private note',staffId:'',status:'confirmed',price:2000,createdAt:'2026-09-01T00:00:00Z'};

test('platform event IDs are deterministic and valid Google Calendar IDs',async()=>{const a=await calendar.platformCalendarEventId(booking.id),b=await calendar.platformCalendarEventId(booking.id);assert.equal(a,b);assert.match(a,/^[0-9a-v]{5,1024}$/);assert.notEqual(a,await calendar.platformCalendarEventId('another-booking'))});
test('platform events preserve Harare time and exclude customer contact data',async()=>{const id=await calendar.platformCalendarEventId(booking.id),event=calendar.platformCalendarEvent(studio,booking,id),serialized=JSON.stringify(event);assert.equal(event.start.dateTime,'2026-09-10T07:00:00.000Z');assert.equal(event.end.dateTime,'2026-09-10T08:30:00.000Z');assert.equal(event.start.timeZone,'Africa/Harare');assert.equal(event.visibility,'private');assert.equal(event.reminders.useDefault,false);assert.ok(serialized.includes('6 musicians'));for(const privateValue of [booking.customer,booking.phone,booking.note,booking.name])assert.ok(!serialized.includes(privateValue))});
test('cancelled sessions remain auditable without blocking calendar time',async()=>{const id=await calendar.platformCalendarEventId(booking.id),event=calendar.platformCalendarEvent(studio,{...booking,status:'cancelled'},id);assert.match(event.summary,/^\[Cancelled\]/);assert.equal(event.transparency,'transparent');assert.equal(event.extendedProperties.private.sessionsStatus,'cancelled')});

after(()=>rmSync(temp,{recursive:true,force:true}));
