import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');
const onboarding=(await read('drizzle/0018_phase45_identity_onboarding.sql')).replaceAll('--> statement-breakpoint','');
const operations=(await read('drizzle/0019_phase5_booking_ops_cases.sql')).replaceAll('--> statement-breakpoint','');
const now='2026-09-13T00:00:00.000Z';
function database(){const db=new DatabaseSync(':memory:');db.exec(onboarding);db.exec(operations);return db}

test('Phase 4.5 stores application onboarding state without authentication secrets or citizenship inference',()=>{
 const db=database();
 for(const table of ['sessions_user_profiles','sessions_user_contacts','sessions_consents','sessions_onboarding_journeys','sessions_continuation_intents','sessions_user_lifecycle_events'])assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)?.name,table);
 const allColumns=['sessions_user_profiles','sessions_user_contacts','sessions_consents','sessions_onboarding_journeys','sessions_continuation_intents'].flatMap(table=>db.prepare(`PRAGMA table_info(${table})`).all().map(row=>String(row.name)));
 assert.equal(allColumns.some(name=>/password|otp_secret|refresh_token|mfa_secret|citizenship/i.test(name)),false,'D1 onboarding must not become an auth-secret or citizenship store');
 db.close();
});

test('contact model keeps verified phone identity separate from WhatsApp opt-in',()=>{
 const db=database();
 db.prepare('INSERT INTO sessions_user_profiles(user_id,status,created_at,updated_at) VALUES(?,?,?,?)').run('u1','identity_verified',now,now);
 db.prepare('INSERT INTO sessions_user_contacts(id,user_id,kind,value,is_primary,verified_at,source,consent_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('phone','u1','phone','+263771234567',1,now,'identity_provider','not_applicable',now,now);
 db.prepare('INSERT INTO sessions_user_contacts(id,user_id,kind,value,is_primary,verified_at,source,consent_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('wa','u1','whatsapp','+263771234567',0,now,'user','opted_in',now,now);
 assert.deepEqual(db.prepare('SELECT kind,consent_status FROM sessions_user_contacts WHERE user_id=? ORDER BY kind').all('u1'),[{kind:'phone',consent_status:'not_applicable'},{kind:'whatsapp',consent_status:'opted_in'}]);
 db.close();
});

test('consent and lifecycle ledgers are append-only and version attributable',()=>{
 const db=database();
 db.prepare('INSERT INTO sessions_consents(id,user_id,consent_type,document_version,decision,channel,source,idempotency_key,occurred_at) VALUES(?,?,?,?,?,?,?,?,?)').run('c1','u1','privacy','2026-09-13','granted','pwa','onboarding','k1',now);
 assert.equal(db.prepare('SELECT document_version FROM sessions_consents WHERE id=?').get('c1').document_version,'2026-09-13');
 assert.throws(()=>db.prepare('UPDATE sessions_consents SET decision=? WHERE id=?').run('withdrawn','c1'),/append-only/);
 db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,created_at) VALUES(?,?,?,?,?,?)').run('l1','system','u1','customer_activated','customer',now);
 assert.throws(()=>db.prepare('DELETE FROM sessions_user_lifecycle_events WHERE id=?').run('l1'),/append-only/);
 db.close();
});

test('continuation intents reject external-style return paths and support one bounded state record',()=>{
 const db=database();
 db.prepare('INSERT INTO sessions_continuation_intents(digest,kind,return_path,status,created_at,expires_at) VALUES(?,?,?,?,?,?)').run('digest','booking','/requests/abc','pending',now,'2026-09-13T00:15:00.000Z');
 assert.equal(db.prepare('SELECT return_path FROM sessions_continuation_intents WHERE digest=?').get('digest').return_path,'/requests/abc');
 assert.throws(()=>db.prepare('INSERT INTO sessions_continuation_intents(digest,kind,return_path,status,created_at,expires_at) VALUES(?,?,?,?,?,?)').run('bad','booking','//evil.example','pending',now,'2026-09-13T00:15:00.000Z'),/CHECK/);
 db.close();
});

test('onboarding states support customer provider and corporate lifecycle without role grants',()=>{
 const db=database();
 for(const [id,journey,status,step,context] of [['j1','customer','active','complete',''],['j2','provider','under_review','verification','studio-1'],['j3','corporate','security_setup_required','mfa','staff-1']])db.prepare('INSERT INTO sessions_onboarding_journeys(id,user_id,journey,context_key,status,current_step,started_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(id,'u1',journey,context,status,step,now,now);
 const cols=db.prepare('PRAGMA table_info(sessions_onboarding_journeys)').all().map(row=>String(row.name));
 assert.equal(cols.some(name=>/role|permission|admin/i.test(name)),false,'onboarding intention/state must not grant authority');
 assert.equal(db.prepare('SELECT count(*) AS n FROM sessions_onboarding_journeys WHERE user_id=?').get('u1').n,3);
 db.close();
});

test('Phase 5 creates canonical operations state and append-only event streams without duplicating bookings',()=>{
 const db=database();
 for(const table of ['booking_operation_state','booking_operation_events','operational_cases','operational_case_events','operational_case_links'])assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)?.name,table);
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>String(row.name));
 assert.equal(tables.includes('corporate_bookings'),false);
 assert.equal(tables.includes('case_bookings'),false);
 db.prepare('INSERT INTO booking_operation_events(id,booking_id,studio_id,actor,event,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?)').run('e1','b1','s1','staff-1','attention_flagged','op-1',now);
 assert.throws(()=>db.prepare('UPDATE booking_operation_events SET event=? WHERE id=?').run('changed','e1'),/append-only/);
 db.close();
});

test('case closure requires resolution code and timestamps at the database boundary',()=>{
 const db=database();
 assert.throws(()=>db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,classification,created_at,updated_at,closed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('case-1','SES-CASE-0001','booking_operations','medium','normal','closed','staff','u1','internal',now,now,now),/CHECK/);
 db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,classification,resolution_code,created_at,updated_at,resolved_at,closed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('case-2','SES-CASE-0002','booking_operations','medium','normal','closed','staff','u1','internal','resolved_with_customer',now,now,now,now);
 assert.equal(db.prepare('SELECT status FROM operational_cases WHERE id=?').get('case-2').status,'closed');
 db.close();
});

test('case events are immutable and support restricted evidence references without copying evidence',()=>{
 const db=database();
 db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,classification,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('case-1','SES-CASE-0001','trust_safety','high','high','open','staff','u1','restricted',now,now);
 db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,evidence_media_id,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('ce1','case-1','trust-1','evidence_linked','internal','restricted','media-123','event-1',now);
 assert.equal(db.prepare('SELECT evidence_media_id FROM operational_case_events WHERE id=?').get('ce1').evidence_media_id,'media-123');
 assert.throws(()=>db.prepare('DELETE FROM operational_case_events WHERE id=?').run('ce1'),/append-only/);
 db.close();
});
