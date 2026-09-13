import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,primaryKey,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';

export const sessionsUserProfiles=sqliteTable('sessions_user_profiles',{
 userId:text('user_id').primaryKey(),
 status:text('status').notNull().default('identity_verified'),
 displayName:text('display_name'),
 market:text('market').notNull().default('ZW'),
 locale:text('locale').notNull().default('en-ZW'),
 lastContextType:text('last_context_type'),
 lastContextId:text('last_context_id'),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 check('sessions_user_profile_status_valid',sql`${t.status} IN ('identity_verified','profile_required','consent_required','active','restricted','suspended','deletion_pending','terminated')`),
 check('sessions_user_profile_context_valid',sql`${t.lastContextType} IS NULL OR ${t.lastContextType} IN ('personal','provider','corporate')`),
 index('sessions_user_profile_status').on(t.status,t.updatedAt),
]);

export const sessionsUserContacts=sqliteTable('sessions_user_contacts',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 kind:text('kind').notNull(),
 value:text('value').notNull(),
 isPrimary:integer('is_primary').notNull().default(0),
 verifiedAt:text('verified_at'),
 source:text('source').notNull(),
 consentStatus:text('consent_status').notNull().default('not_applicable'),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('sessions_contact_user_kind_value').on(t.userId,t.kind,t.value),
 uniqueIndex('sessions_contact_one_primary_kind').on(t.userId,t.kind).where(sql`${t.isPrimary} = 1`),
 uniqueIndex('sessions_verified_identity_contact_unique').on(t.kind,t.value).where(sql`${t.source} = 'identity_provider' AND ${t.kind} IN ('email','phone')`),
 index('sessions_contact_user_kind').on(t.userId,t.kind),
 check('sessions_contact_kind_valid',sql`${t.kind} IN ('email','phone','whatsapp')`),
 check('sessions_contact_source_valid',sql`${t.source} IN ('identity_provider','user')`),
 check('sessions_contact_primary_valid',sql`${t.isPrimary} IN (0,1)`),
 check('sessions_contact_consent_valid',sql`${t.consentStatus} IN ('not_applicable','pending','opted_in','opted_out')`),
]);

export const sessionsConsents=sqliteTable('sessions_consents',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 consentType:text('consent_type').notNull(),
 documentVersion:text('document_version').notNull(),
 decision:text('decision').notNull(),
 channel:text('channel').notNull(),
 source:text('source').notNull(),
 idempotencyKey:text('idempotency_key').notNull(),
 occurredAt:text('occurred_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('sessions_consent_user_key').on(t.userId,t.idempotencyKey),
 index('sessions_consent_user_type_time').on(t.userId,t.consentType,t.occurredAt),
 check('sessions_consent_decision_valid',sql`${t.decision} IN ('granted','declined','withdrawn')`),
 check('sessions_consent_channel_valid',sql`${t.channel} IN ('web','pwa','ios','android','corporate')`),
]);

export const sessionsOnboardingJourneys=sqliteTable('sessions_onboarding_journeys',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 journey:text('journey').notNull(),
 contextKey:text('context_key').notNull().default(''),
 status:text('status').notNull(),
 currentStep:text('current_step').notNull(),
 revision:integer('revision').notNull().default(0),
 startedAt:text('started_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 completedAt:text('completed_at'),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('sessions_onboarding_user_journey_context').on(t.userId,t.journey,t.contextKey),
 index('sessions_onboarding_user_status').on(t.userId,t.status,t.updatedAt),
 check('sessions_onboarding_journey_valid',sql`${t.journey} IN ('customer','provider','corporate')`),
 check('sessions_onboarding_status_valid',sql`${t.status} IN ('identity_verified','profile_required','consent_required','active','draft','submitted','under_review','changes_requested','approved','rejected','invited','accepted','security_setup_required','restricted','suspended','departed','deletion_pending','terminated')`),
]);

export const sessionsContinuationIntents=sqliteTable('sessions_continuation_intents',{
 digest:text('digest').primaryKey(),
 userId:text('user_id'),
 kind:text('kind').notNull(),
 returnPath:text('return_path').notNull(),
 status:text('status').notNull().default('pending'),
 createdAt:text('created_at').notNull(),
 expiresAt:text('expires_at').notNull(),
 consumedAt:text('consumed_at'),
 content:text('content').notNull().default('{}'),
},t=>[
 index('sessions_continuation_user_status').on(t.userId,t.status,t.expiresAt),
 check('sessions_continuation_status_valid',sql`${t.status} IN ('pending','consumed','expired','cancelled')`),
 check('sessions_continuation_path_relative',sql`${t.returnPath} LIKE '/%' AND ${t.returnPath} NOT LIKE '//%'`),
]);

export const sessionsUserLifecycleEvents=sqliteTable('sessions_user_lifecycle_events',{
 id:text('id').primaryKey(),
 actorUserId:text('actor_user_id').notNull(),
 targetUserId:text('target_user_id').notNull(),
 event:text('event').notNull(),
 contextType:text('context_type').notNull(),
 contextId:text('context_id'),
 reasonCode:text('reason_code'),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 index('sessions_lifecycle_target_time').on(t.targetUserId,t.createdAt),
 index('sessions_lifecycle_context_time').on(t.contextType,t.contextId,t.createdAt),
 check('sessions_lifecycle_context_valid',sql`${t.contextType} IN ('identity','customer','provider','corporate')`),
]);
