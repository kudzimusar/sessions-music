import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);const read=path=>readFile(new URL(path,root),'utf8');
const clean=value=>value.replaceAll('--> statement-breakpoint','');
const migrations=clean(await read('drizzle/0013_corporate_workforce.sql'))+clean(await read('drizzle/0014_privileged_administration.sql'))+clean(await read('drizzle/0018_phase45_identity_onboarding.sql'))+clean(await read('drizzle/0019_phase5_booking_ops_cases.sql'))+clean(await read('drizzle/0020_staff_lifecycle_access.sql'));
function database(){const db=new DatabaseSync(':memory:');db.exec(migrations);return db}

const now='2026-09-13T00:00:00.000Z';
test('Phase 4.5 identity application state contains no password OTP refresh token MFA secret or citizenship columns',()=>{
 const db=database();const tables=['sessions_user_profiles','sessions_user_contacts','sessions_consents','sessions_onboarding_journeys','sessions_continuation_intents','sessions_user_lifecycle_events'];
 for(const table of tables){const columns=db.prepare(`PRAGMA table_info(${table})`).all().map(row=>String(row.name));assert.equal(columns.some(name=>/password|otp|refresh|mfa|secret|citizen/i.test(name)),false,`${table} must not persist authentication secrets or inferred citizenship`)}db.close();
});

test('consent and lifecycle audit history are append-only',()=>{
 const db=database();db.prepare('INSERT INTO sessions_consents(id,user_id,consent_type,document_version,decision,channel,source,idempotency_key,occurred_at,content) VALUES(?,?,?,?,?,?,?,?,?,?)').run('c1','u1','terms','v1','granted','web','test','k-consent',now,'{}');assert.throws(()=>db.prepare("UPDATE sessions_consents SET decision='withdrawn' WHERE id='c1'").run(),/append-only/);assert.throws(()=>db.prepare("DELETE FROM sessions_consents WHERE id='c1'").run(),/append-only/);
 db.prepare('INSERT INTO sessions_user_lifecycle_events(id,actor_user_id,target_user_id,event,context_type,created_at,content) VALUES(?,?,?,?,?,?,?)').run('l1','a1','u1','customer.active','customer',now,'{}');assert.throws(()=>db.prepare("UPDATE sessions_user_lifecycle_events SET event='rewritten' WHERE id='l1'").run(),/append-only/);db.close();
});

test('continuation records reject external protocol-relative targets',()=>{const db=database();assert.throws(()=>db.prepare('INSERT INTO sessions_continuation_intents(digest,kind,return_path,status,created_at,expires_at,content) VALUES(?,?,?,?,?,?,?)').run('x','route','//evil.example/path','pending',now,'2026-09-13T00:20:00.000Z','{}'),/CHECK/);db.close()});

test('staff access overlay represents termination without mutating historical workforce schema',()=>{
 const db=database();db.prepare('INSERT INTO corporate_staff(id,user_id,staff_code,status,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?)').run('staff1','user1','SZ-001','active',now,now,'{}');db.prepare('INSERT INTO corporate_staff_access_state(staff_id,user_id,status,reason_code,reason,effective_at,updated_by,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?)').run('staff1','user1','terminated','employment_end','Employment ended',now,'admin',now,'{}');assert.equal(db.prepare('SELECT status FROM corporate_staff_access_state WHERE staff_id=?').get('staff1').status,'terminated');assert.throws(()=>db.prepare('UPDATE corporate_staff_access_state SET status=? WHERE staff_id=?').run('owner','staff1'),/CHECK/);db.close();
});

test('Booking Operations overlay cannot become a duplicate customer or pricing ledger',()=>{
 const db=database();const columns=db.prepare('PRAGMA table_info(booking_operation_state)').all().map(row=>String(row.name));for(const forbidden of ['customer','room_subtotal_cents','gross_cents','customer_total_cents','currency'])assert.equal(columns.includes(forbidden),false);const events=db.prepare('PRAGMA table_info(booking_operation_events)').all().map(row=>String(row.name));assert.ok(events.includes('idempotency_key'));db.close();
});

test('case resolution and closure require durable resolution facts',()=>{
 const db=database();const base=['case1','CASE-1','booking_operations','medium','normal','resolved','staff','reporter','internal',now,now,'{}'];assert.throws(()=>db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,classification,created_at,updated_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(...base),/CHECK/);
 db.prepare('INSERT INTO operational_cases(id,reference,category,severity,priority,status,source,reporter,classification,resolution_code,created_at,updated_at,resolved_at,content) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('case2','CASE-2','booking_operations','medium','normal','resolved','staff','reporter','internal','fixed',now,now,now,'{}');assert.equal(db.prepare("SELECT status FROM operational_cases WHERE id='case2'").get().status,'resolved');db.close();
});

test('booking and case operational event streams are immutable',()=>{
 const db=database();db.prepare('INSERT INTO booking_operation_events(id,booking_id,studio_id,actor,event,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?)').run('be1','b1','s1','a1','note.added','key1',now,'{}');assert.throws(()=>db.prepare("DELETE FROM booking_operation_events WHERE id='be1'").run(),/append-only/);db.prepare('INSERT INTO operational_case_events(id,case_id,actor,event,visibility,classification,idempotency_key,created_at,content) VALUES(?,?,?,?,?,?,?,?,?)').run('ce1','case1','a1','note.added','internal','internal','key2',now,'{}');assert.throws(()=>db.prepare("UPDATE operational_case_events SET event='rewritten' WHERE id='ce1'").run(),/append-only/);db.close();
});

test('production corporate roles fail closed against active workforce and access state',async()=>{const source=await read('app/chatgpt-auth.ts');assert.match(source,/corporate_staff_access_state/);assert.match(source,/COALESCE\(a\.status,'active'\)='active'/);assert.match(source,/roles\.filter\(role=>!corporateRoleSet\.has\(role\)\)/);assert.match(source,/Production corporate authority fails closed/)});

test('staff lifecycle mutation revokes privileged session and records both organization and identity audit',async()=>{const source=await read('app/api/corporate/staff-lifecycle/route.ts');assert.match(source,/identity:lifecycle\.manage/);assert.match(source,/You cannot suspend, depart or terminate your own corporate identity/);assert.match(source,/corporate_privileged_sessions SET status='revoked'/);assert.match(source,/sessions_user_lifecycle_events/);assert.match(source,/corporate_security_events/);assert.match(source,/terminated staff identity cannot be reactivated/)});

test('legacy marketplace data paths require a production identity or fail closed before data is returned',async()=>{const [registry,quotes,state]=await Promise.all([read('db/registry-store.ts'),read('app/api/quotes/route.ts'),read('app/api/state/route.ts')]);assert.match(registry,/if\(!user\)throw new Error\('SESSIONS_IDENTITY_REQUIRED'\)/);assert.match(quotes,/getProductionUser/);assert.match(quotes,/401/);assert.match(state,/getProductionUser/);assert.match(state,/401/)});

test('Booking Operations API is an overlay over canonical studio_bookings with optimistic revision and idempotency',async()=>{const source=await read('app/api/corporate/booking-ops/route.ts');assert.match(source,/FROM studio_bookings b LEFT JOIN booking_operation_state/);assert.match(source,/Booking operations state changed\. Refresh before saving/);assert.match(source,/booking_operation_events/);assert.match(source,/idempotencyKey/);assert.doesNotMatch(source,/INSERT INTO studio_bookings/)});

test('Cases API enforces category policy controlled transitions explicit reopen and restricted evidence',async()=>{const source=await read('app/api/corporate/cases/route.ts');assert.match(source,/canManageCaseCategory/);assert.match(source,/canReadCaseCategory/);assert.match(source,/canTransitionCase/);assert.match(source,/explicit reopen workflow/);assert.match(source,/cases:restricted\.read/);assert.match(source,/purpose='case_evidence'/);assert.match(source,/resolutionCode/)});

test('Phase 5 corporate modules route to dedicated responsive workspaces',async()=>{const [page,modules,booking,cases,css]=await Promise.all([read('app/[...slug]/page.tsx'),read('lib/corporate-control-plane.ts'),read('app/corporate-booking-ops.tsx'),read('app/corporate-cases.tsx'),read('app/phase5-operations.css')]);assert.match(page,/CorporateBookingOps/);assert.match(page,/CorporateCases/);assert.match(page,/requiredPermissions=\{\['cases:read'\]\}/);assert.match(modules,/Canonical operational cases/);assert.match(booking,/data-p5="booking-ops"/);assert.match(cases,/data-p5="cases"/);assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/min-height:48px/)});

test('MFA setup uses Supabase TOTP and never writes an MFA secret to D1',async()=>{const [auth,onboardingSchema]=await Promise.all([read('app/production-auth.tsx'),read('db/onboarding-schema.ts')]);assert.match(auth,/mfa\.enroll\(\{factorType:'totp'/);assert.match(auth,/challengeAndVerify/);assert.match(auth,/getAuthenticatorAssuranceLevel/);assert.match(auth,/bootstrapServerSession/);assert.doesNotMatch(onboardingSchema,/mfaSecret|totpSecret|otpSecret/i)});

test('workspace switching can only persist a server-returned authorized context',async()=>{const [ui,route]=await Promise.all([read('app/workspace-switcher.tsx'),read('app/api/onboarding/route.ts')]);assert.match(ui,/snapshot\?\.contexts\.filter\(context=>context\.status==='active'\)/);assert.match(ui,/action:'setLastContext'/);assert.match(route,/snapshot\.contexts\.some\(context=>context\.type===body\.contextType&&context\.id===body\.contextId&&context\.status==='active'\)/)});

test('provider onboarding reads application and membership state and does not grant roles',async()=>{const [page,ui]=await Promise.all([read('app/onboarding/provider/page.tsx'),read('app/provider-onboarding.tsx')]);assert.match(page,/studio_claim_requests/);assert.match(page,/studio_registrations/);assert.match(page,/studio_verification_requests/);assert.match(page,/actor\.memberships\.filter/);assert.match(ui,/Starting an application does not grant studio authority/);assert.doesNotMatch(page,/platform_role_assignments|provisionStudioMembership|setPlatformRole/)});

test('recovery changes are verification-first and do not auto-merge identities',async()=>{const auth=await read('app/production-auth.tsx');assert.match(auth,/auth\.updateUser/);assert.match(auth,/Verify MFA for this session before changing a recovery identity/);assert.match(auth,/never auto-merges another account/);assert.doesNotMatch(auth,/account_merge_requests.*insert/s)});
