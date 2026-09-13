import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const migrationPaths=[
 'drizzle/0000_premium_charles_xavier.sql',
 'drizzle/0002_giant_texas_twister.sql',
 'drizzle/0008_wise_war_machine.sql',
 'drizzle/0009_wise_iron_lad.sql',
 'drizzle/0013_corporate_workforce.sql',
 'drizzle/0014_privileged_administration.sql',
 'drizzle/0018_phase45_identity_onboarding.sql',
 'drizzle/0019_phase5_booking_ops_cases.sql',
 'drizzle/0020_staff_lifecycle_access.sql',
 'drizzle/0021_phase1_5_integrity_hardening.sql',
];
const migrations=(await Promise.all(migrationPaths.map(read))).map(value=>value.replaceAll('--> statement-breakpoint','')).join('\n');
const now='2026-09-13T12:00:00.000Z';

function database(){
 const db=new DatabaseSync(':memory:');db.exec(migrations);
 db.prepare('INSERT INTO sessions_user_profiles(user_id,status,display_name,created_at,updated_at) VALUES(?,?,?,?,?)').run('u1','active','User One',now,now);
 db.prepare('INSERT INTO studio_registry(id,owner,revision,content) VALUES(?,?,?,?)').run('s1','owner-1',0,'{"name":"Studio One"}');
 db.prepare('INSERT INTO studio_bookings(id,studio_id,customer,request_key,content) VALUES(?,?,?,?,?)').run('b1','s1','u1','request-1','{"status":"confirmed"}');
 return db;
}

function insertCase(db,id='case-1',reference='SES-CASE-0001'){
 db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,booking_id,studio_id,customer,classification,created_at,updated_at,revision,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,reference,'booking_operations','medium','normal','open','staff','staff-1','b1','s1','u1','internal',now,now,0,'{"summary":"Booking case","description":"Investigate booking"}');
}

test('database rejects invalid case transitions and stale direct revisions even if application code regresses',()=>{
 const db=database();insertCase(db);
 assert.throws(()=>db.prepare("UPDATE operational_cases SET status='closed',resolution_code='done',resolved_at=?,closed_at=?,revision=1,updated_at=? WHERE id='case-1'").run(now,now,now),/invalid operational case status transition/);
 db.prepare("UPDATE operational_cases SET status='triaged',revision=1,updated_at=? WHERE id='case-1'").run(now);
 assert.throws(()=>db.prepare("UPDATE operational_cases SET priority='urgent',revision=1,updated_at=? WHERE id='case-1'").run(now),/revision must advance exactly once/);
 db.prepare("UPDATE operational_cases SET status='in_progress',revision=2,updated_at=? WHERE id='case-1'").run(now);
 assert.equal(db.prepare("SELECT status,revision FROM operational_cases WHERE id='case-1'").get().status,'in_progress');
 assert.equal(db.prepare("SELECT revision FROM operational_cases WHERE id='case-1'").get().revision,2);
 db.close();
});

test('booking operations overlays cannot point at a different or missing canonical booking studio',()=>{
 const db=database();
 assert.throws(()=>db.prepare('INSERT INTO booking_operation_state(booking_id,studio_id,updated_at) VALUES(?,?,?)').run('b1','wrong-studio',now),/canonical booking and studio/);
 db.prepare('INSERT INTO booking_operation_state(booking_id,studio_id,updated_at) VALUES(?,?,?)').run('b1','s1',now);
 assert.throws(()=>db.prepare("UPDATE booking_operation_state SET priority='urgent',revision=2,updated_at=? WHERE booking_id='b1'").run(now),/revision must advance exactly once/);
 db.prepare("UPDATE booking_operation_state SET priority='urgent',revision=1,updated_at=? WHERE booking_id='b1'").run(now);
 assert.equal(db.prepare("SELECT priority FROM booking_operation_state WHERE booking_id='b1'").get().priority,'urgent');
 db.close();
});

test('case canonical links fail closed on dangling or cross-object records',()=>{
 const db=database();insertCase(db);
 assert.throws(()=>db.prepare('INSERT INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').run('l1','case-1','booking','missing','staff-1',now),/canonical booking/);
 assert.throws(()=>db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,booking_id,studio_id,classification,created_at,updated_at,revision,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('case-bad','SES-CASE-0009','booking_operations','medium','normal','open','staff','staff-1','b1','different','internal',now,now,0,'{}'),/canonical studio|same canonical booking/);
 db.close();
});

test('restricted evidence is case-bound and case links remain append-only',()=>{
 const db=database();insertCase(db);insertCase(db,'case-2','SES-CASE-0002');
 db.prepare('INSERT INTO uploads(id,owner,type,case_id,purpose,created_at) VALUES(?,?,?,?,?,?)').run('11111111-1111-1111-1111-111111111111','staff-1','image/png','case-1','case_evidence',now);
 db.prepare('INSERT INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').run('media-link','case-1','media','11111111-1111-1111-1111-111111111111','staff-1',now);
 assert.throws(()=>db.prepare('INSERT INTO operational_case_links(id,case_id,object_type,object_id,created_by,created_at) VALUES(?,?,?,?,?,?)').run('wrong-link','case-2','media','11111111-1111-1111-1111-111111111111','staff-1',now),/same case/);
 assert.throws(()=>db.prepare("UPDATE operational_case_links SET object_id='other' WHERE id='media-link'").run(),/append-only/);
 assert.throws(()=>db.prepare("DELETE FROM operational_case_links WHERE id='media-link'").run(),/append-only/);
 assert.throws(()=>db.prepare('INSERT INTO uploads(id,owner,type,purpose,created_at) VALUES(?,?,?,?,?)').run('22222222-2222-2222-2222-222222222222','staff-1','image/png','case_evidence',now),/bound to an existing case/);
 db.close();
});

test('corporate audit logs are immutable and staff access cannot bypass workforce identity or terminal state',()=>{
 const db=database();
 db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('staff-1','user-1','SZ-001','active',now,now,'{}');
 assert.throws(()=>db.prepare('INSERT INTO corporate_staff_access_state(staff_id,user_id,status,effective_at,updated_by,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('staff-1','other-user','active',now,'admin',now,'{}'),/canonical workforce identity/);
 db.prepare('INSERT INTO corporate_staff_access_state(staff_id,user_id,status,effective_at,updated_by,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('staff-1','user-1','active',now,'admin',now,'{}');
 db.prepare("UPDATE corporate_staff_access_state SET status='terminated',updated_at=? WHERE staff_id='staff-1'").run(now);
 assert.throws(()=>db.prepare("UPDATE corporate_staff_access_state SET status='active',updated_at=? WHERE staff_id='staff-1'").run(now),/terminal staff lifecycle/);
 db.prepare('INSERT INTO corporate_org_events(id,actor,event,entity_type,entity_id,created_at,content) VALUES(?,?,?,?,?,?,?)').run('org-1','admin','staff.test','staff','staff-1',now,'{}');
 assert.throws(()=>db.prepare("DELETE FROM corporate_org_events WHERE id='org-1'").run(),/append-only/);
 db.prepare('INSERT INTO corporate_security_events(id,actor,identity_session_id,event,target_type,target_id,created_at,content) VALUES(?,?,?,?,?,?,?,?)').run('sec-1','admin','session-1','security.test','staff','staff-1',now,'{}');
 assert.throws(()=>db.prepare("UPDATE corporate_security_events SET event='changed' WHERE id='sec-1'").run(),/append-only/);
 db.close();
});

test('case API and media paths enforce separate linked-object and case-evidence authorization',async()=>{
 const [cases,policy,upload,media,ui]=await Promise.all([
  read('app/api/corporate/cases/route.ts'),read('lib/data-access-policy.ts'),read('app/api/upload/route.ts'),read('app/api/media/[id]/route.ts'),read('app/corporate-cases.tsx'),
 ]);
 assert.match(policy,/canReadCaseLinkedObject/);
 assert.match(cases,/canReadCaseLinkedObject\(actor,input\.objectType\)/);
 assert.match(cases,/\.filter\(row=>canReadCaseLinkedObject/);
 assert.match(cases,/sanitizeEventContent/);
 assert.match(cases,/purpose='case_evidence' AND case_id=\?/);
 assert.match(upload,/form\.get\('caseId'\)/);
 assert.match(upload,/canManageCaseCategory/);
 assert.match(upload,/INSERT INTO uploads\(id,owner,type,studio_id,room_id,booking_id,case_id,purpose,created_at\)/);
 assert.match(media,/row\.purpose==='case_evidence'/);
 assert.match(media,/canReadCaseCategory/);
 assert.match(ui,/form\.set\('caseId',item\.id\)/);
 assert.match(ui,/canManage/);
});

test('verified contacts cannot be reassigned between Supabase identities and device posture is explicit',async()=>{
 const migration=await read('supabase/migrations/202609130001_identity_contact_hardening.sql');
 assert.doesNotMatch(migration,/ON CONFLICT\s*\(kind,\s*value_normalized\)\s*DO UPDATE\s+SET\s+user_id\s*=\s*excluded\.user_id/is);
 assert.match(migration,/verified_contact_conflict/);
 assert.match(migration,/verified_contacts_one_primary_kind_idx/);
 assert.match(migration,/'session_registered'/);
 assert.match(migration,/ds\.session_id is not null/);
});

test('corporate onboarding is invitation-bound, policy-versioned and device-gated before workspace context',async()=>{
 const [organization,onboarding,snapshot,gateway]=await Promise.all([
  read('app/api/corporate/organization/route.ts'),read('app/api/onboarding/route.ts'),read('lib/onboarding-server.ts'),read('app/onboarding-gateway.tsx'),
 ]);
 assert.match(organization,/staff\.invited/);
 assert.match(organization,/'invited',null,null/);
 assert.match(onboarding,/acceptCorporateInvitation/);
 assert.match(onboarding,/completeCorporateSecuritySetup/);
 assert.match(onboarding,/actor\.deviceRegistered/);
 assert.match(onboarding,/corporate_access/);
 assert.match(snapshot,/corporateAccess:'corporate-access-2026-09-13-v1'/);
 assert.match(snapshot,/journey&&String\(journey\.status\)==='active'/);
 assert.match(gateway,/registerBrowserDevice/);
 assert.match(gateway,/Accept access policy/);
 assert.match(gateway,/Finish setup/);
});
