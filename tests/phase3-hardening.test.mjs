import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root),'utf8');

test('platform authority mutation is intent-audited and verified against Supabase',async()=>{
 const [route,admin]=await Promise.all([read('app/api/corporate/roles/route.ts'),read('lib/supabase-admin.ts')]);
 const requested=route.indexOf("'platform_role.change_requested'");
 const mutation=route.indexOf('await setPlatformRole');
 const outcome=route.indexOf("input.enabled?'platform_role.granted':'platform_role.revoked'");
 assert.ok(requested>=0&&mutation>requested&&outcome>mutation,'audit intent must precede the external authority mutation and its outcome');
 assert.match(route,/platform_role\.change_failed/);
 assert.match(route,/auditRecorded:false/);
 assert.match(admin,/export async function platformRoleActive/);
 assert.match(admin,/const active=await platformRoleActive\(input\.userId,input\.role\)/);
 assert.match(admin,/if\(active!==input\.enabled\)throw new Error\('Supabase authority verification failed/);
});

test('access review remediation is immutable after success and reconstructable across system failures',async()=>{
 const route=await read('app/api/corporate/access-reviews/route.ts');
 assert.match(route,/A successfully remediated access decision is immutable/);
 const requested=route.indexOf("'access_review.remediation_requested'");
 const mutation=route.indexOf('await setPlatformRole');
 const completed=route.indexOf("'access_review.remediated'");
 assert.ok(requested>=0&&mutation>requested&&completed>mutation,'remediation intent must exist before authority revocation and completion audit');
 assert.match(route,/access_review\.remediation_failed/);
 assert.match(route,/authority_source_change_or_verification_failed/);
 assert.match(route,/const safeJson=/);
 assert.match(route,/Access review due date must be in the future/);
});

test('D1 refuses impossible access-review states even if a future API path is wrong',async()=>{
 const db=new DatabaseSync(':memory:');
 const migrations=(await read('drizzle/0015_access_reviews.sql')).replaceAll('--> statement-breakpoint','')+'\n'+(await read('drizzle/0016_access_review_invariants.sql')).replaceAll('--> statement-breakpoint','');
 db.exec(migrations);
 const now='2026-09-12T00:00:00.000Z';
 db.prepare('INSERT INTO corporate_access_reviews(id,title,status,created_by,created_at,snapshot_count,content) VALUES(?,?,?,?,?,?,?)').run('r1','Security review','open','admin-a',now,1,'{}');
 db.prepare('INSERT INTO corporate_access_review_items(id,review_id,user_id,role,decision,remediation_status,content) VALUES(?,?,?,?,?,?,?)').run('i1','r1','user-a','finance_admin','pending','not_required','{}');
 assert.throws(()=>db.prepare("UPDATE corporate_access_review_items SET decision='retain',remediation_status='not_required' WHERE id='i1'").run(),/invalid access review item state/);
 db.prepare("UPDATE corporate_access_review_items SET decision='revoke',remediation_status='pending',reviewer='admin-a',reviewed_at=? WHERE id='i1'").run(now);
 assert.throws(()=>db.prepare("UPDATE corporate_access_reviews SET status='completed',completed_at=? WHERE id='r1'").run(now),/access review still has unresolved authority/);
 db.prepare("UPDATE corporate_access_review_items SET remediation_status='completed',remediated_at=? WHERE id='i1'").run(now);
 assert.throws(()=>db.prepare("UPDATE corporate_access_review_items SET decision='retain',remediation_status='not_required',remediated_at=NULL WHERE id='i1'").run(),/completed remediation decisions are immutable/);
 db.prepare("UPDATE corporate_access_reviews SET status='completed',completed_at=? WHERE id='r1'").run(now);
 assert.throws(()=>db.prepare("UPDATE corporate_access_review_items SET content='{}' WHERE id='i1'").run(),/closed access review items are immutable/);
 db.close();
});

test('restricted and confidential media are never retained in browser caches',async()=>{
 const media=await read('app/api/media/[id]/route.ts');
 assert.match(media,/let cache='private, no-store, max-age=0'/);
 assert.match(media,/cache='public, max-age=3600, stale-while-revalidate=86400'/);
 assert.doesNotMatch(media,/let cache='private, max-age=3600'/);
 assert.match(media,/headers\.Pragma='no-cache'/);
 assert.match(media,/Media unavailable.*Cache-Control.*private, no-store, max-age=0/s);
});

test('Super Administration exposes access governance directly',async()=>{
 const workspace=await read('app/corporate-workspace.tsx');
 assert.match(workspace,/Super administration'.*access reviews.*href:'\/corporate\/access'/s);
 assert.match(workspace,/Access governance/);
 assert.match(workspace,/Open access reviews/);
});
