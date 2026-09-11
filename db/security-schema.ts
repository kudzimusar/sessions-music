import {sql} from 'drizzle-orm';
import {sqliteTable,text,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';

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
