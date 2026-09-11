import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';

/**
 * Short-lived privileged Sessions administration context.
 * Platform roles remain sourced from trusted identity; this table never grants a role.
 */
export const corporatePrivilegedSessions=sqliteTable('corporate_privileged_sessions',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 identitySessionId:text('identity_session_id').notNull(),
 status:text('status').notNull(),
 assuranceLevel:text('assurance_level').notNull(),
 purpose:text('purpose').notNull(),
 createdAt:text('created_at').notNull(),
 expiresAt:text('expires_at').notNull(),
 revokedAt:text('revoked_at'),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('one_active_privileged_session_per_user').on(t.userId).where(sql`${t.status} = 'active'`),
 index('privileged_session_identity').on(t.userId,t.identitySessionId,t.status,t.expiresAt),
 check('privileged_session_status',sql`${t.status} IN ('active','revoked','expired')`),
 check('privileged_session_assurance',sql`${t.assuranceLevel} = 'aal2'`),
]);

export const corporateSecurityEvents=sqliteTable('corporate_security_events',{
 id:text('id').primaryKey(),
 actor:text('actor').notNull(),
 identitySessionId:text('identity_session_id').notNull(),
 event:text('event').notNull(),
 targetType:text('target_type'),
 targetId:text('target_id'),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull(),
},t=>[
 index('corporate_security_actor').on(t.actor,t.createdAt),
 index('corporate_security_target').on(t.targetType,t.targetId,t.createdAt),
]);

/**
 * Access reviews snapshot trusted identity assignments for governance. A review
 * decision never grants access. Revocation decisions remain visibly pending until
 * remediation succeeds against the authoritative Supabase role assignment.
 */
export const corporateAccessReviews=sqliteTable('corporate_access_reviews',{
 id:text('id').primaryKey(),
 title:text('title').notNull(),
 status:text('status').notNull(),
 createdBy:text('created_by').notNull(),
 createdAt:text('created_at').notNull(),
 dueAt:text('due_at'),
 completedAt:text('completed_at'),
 snapshotCount:integer('snapshot_count').notNull(),
 content:text('content').notNull(),
},t=>[
 index('corporate_access_review_status').on(t.status,t.createdAt),
 check('corporate_access_review_status_valid',sql`${t.status} IN ('open','completed','cancelled')`),
 check('corporate_access_review_snapshot_count',sql`${t.snapshotCount} >= 0`),
]);

export const corporateAccessReviewItems=sqliteTable('corporate_access_review_items',{
 id:text('id').primaryKey(),
 reviewId:text('review_id').notNull(),
 userId:text('user_id').notNull(),
 role:text('role').notNull(),
 decision:text('decision').notNull(),
 remediationStatus:text('remediation_status').notNull(),
 reviewer:text('reviewer'),
 reviewedAt:text('reviewed_at'),
 remediatedAt:text('remediated_at'),
 snapshotGrantedBy:text('snapshot_granted_by'),
 snapshotGrantedAt:text('snapshot_granted_at'),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('corporate_access_review_subject_role').on(t.reviewId,t.userId,t.role),
 index('corporate_access_review_items_review').on(t.reviewId,t.decision,t.remediationStatus),
 index('corporate_access_review_items_subject').on(t.userId,t.role),
 check('corporate_access_review_decision',sql`${t.decision} IN ('pending','retain','revoke')`),
 check('corporate_access_review_remediation',sql`${t.remediationStatus} IN ('not_required','pending','completed','failed')`),
]);
