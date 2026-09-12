import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';

export const bookingOperationState=sqliteTable('booking_operation_state',{
 bookingId:text('booking_id').primaryKey(),
 studioId:text('studio_id').notNull(),
 operationalState:text('operational_state').notNull().default('normal'),
 priority:text('priority').notNull().default('normal'),
 assignedTo:text('assigned_to'),
 assignedTeam:text('assigned_team'),
 nextActionAt:text('next_action_at'),
 slaState:text('sla_state').notNull().default('on_track'),
 revision:integer('revision').notNull().default(0),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 index('booking_ops_studio_state').on(t.studioId,t.operationalState,t.updatedAt),
 index('booking_ops_assignment').on(t.assignedTeam,t.assignedTo,t.nextActionAt),
 index('booking_ops_sla').on(t.slaState,t.nextActionAt),
 check('booking_ops_state_valid',sql`${t.operationalState} IN ('normal','attention','intervention','waiting_customer','waiting_provider','waiting_internal','resolved')`),
 check('booking_ops_priority_valid',sql`${t.priority} IN ('low','normal','high','urgent')`),
 check('booking_ops_sla_valid',sql`${t.slaState} IN ('on_track','due_soon','breached','paused','complete')`),
]);

export const bookingOperationEvents=sqliteTable('booking_operation_events',{
 id:text('id').primaryKey(),
 bookingId:text('booking_id').notNull(),
 studioId:text('studio_id').notNull(),
 actor:text('actor').notNull(),
 event:text('event').notNull(),
 reasonCode:text('reason_code'),
 caseId:text('case_id'),
 idempotencyKey:text('idempotency_key').notNull(),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('booking_ops_event_actor_key').on(t.actor,t.idempotencyKey),
 index('booking_ops_events_booking_time').on(t.bookingId,t.createdAt),
 index('booking_ops_events_case_time').on(t.caseId,t.createdAt),
]);

export const operationalCases=sqliteTable('operational_cases',{
 id:text('id').primaryKey(),
 reference:text('reference').notNull(),
 category:text('category').notNull(),
 severity:text('severity').notNull().default('medium'),
 priority:text('priority').notNull().default('normal'),
 status:text('status').notNull().default('open'),
 source:text('source').notNull(),
 reporter:text('reporter').notNull(),
 assignedTo:text('assigned_to'),
 assignedTeam:text('assigned_team'),
 bookingId:text('booking_id'),
 studioId:text('studio_id'),
 customer:text('customer'),
 settlementId:text('settlement_id'),
 classification:text('classification').notNull().default('internal'),
 slaTargetAt:text('sla_target_at'),
 nextActionAt:text('next_action_at'),
 resolutionCode:text('resolution_code'),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 resolvedAt:text('resolved_at'),
 closedAt:text('closed_at'),
 revision:integer('revision').notNull().default(0),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('operational_case_reference').on(t.reference),
 index('operational_cases_queue').on(t.status,t.priority,t.nextActionAt),
 index('operational_cases_booking').on(t.bookingId,t.status),
 index('operational_cases_studio').on(t.studioId,t.status),
 index('operational_cases_customer').on(t.customer,t.status),
 index('operational_cases_category_team').on(t.category,t.assignedTeam,t.status),
 check('operational_case_category_valid',sql`${t.category} IN ('customer_support','booking_operations','provider_operations','trust_safety','finance','general_incident')`),
 check('operational_case_severity_valid',sql`${t.severity} IN ('low','medium','high','critical')`),
 check('operational_case_priority_valid',sql`${t.priority} IN ('low','normal','high','urgent')`),
 check('operational_case_status_valid',sql`${t.status} IN ('open','triaged','in_progress','waiting_customer','waiting_provider','waiting_internal','resolved','closed')`),
 check('operational_case_classification_valid',sql`${t.classification} IN ('internal','restricted','confidential')`),
 check('operational_case_resolved_timestamp',sql`${t.status} NOT IN ('resolved','closed') OR ${t.resolvedAt} IS NOT NULL`),
 check('operational_case_closed_timestamp',sql`${t.status} != 'closed' OR ${t.closedAt} IS NOT NULL`),
 check('operational_case_resolution_required',sql`${t.status} NOT IN ('resolved','closed') OR (${t.resolutionCode} IS NOT NULL AND length(trim(${t.resolutionCode})) > 0)`),
]);

export const operationalCaseEvents=sqliteTable('operational_case_events',{
 id:text('id').primaryKey(),
 caseId:text('case_id').notNull(),
 actor:text('actor').notNull(),
 event:text('event').notNull(),
 visibility:text('visibility').notNull().default('internal'),
 classification:text('classification').notNull().default('internal'),
 evidenceMediaId:text('evidence_media_id'),
 idempotencyKey:text('idempotency_key').notNull(),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 uniqueIndex('operational_case_event_actor_key').on(t.actor,t.idempotencyKey),
 index('operational_case_events_case_time').on(t.caseId,t.createdAt),
 check('operational_case_event_visibility_valid',sql`${t.visibility} IN ('internal','customer','provider')`),
 check('operational_case_event_classification_valid',sql`${t.classification} IN ('internal','restricted','confidential')`),
]);

export const operationalCaseLinks=sqliteTable('operational_case_links',{
 id:text('id').primaryKey(),
 caseId:text('case_id').notNull(),
 objectType:text('object_type').notNull(),
 objectId:text('object_id').notNull(),
 createdBy:text('created_by').notNull(),
 createdAt:text('created_at').notNull(),
},t=>[
 uniqueIndex('operational_case_link_unique').on(t.caseId,t.objectType,t.objectId),
 index('operational_case_link_object').on(t.objectType,t.objectId),
 check('operational_case_link_type_valid',sql`${t.objectType} IN ('booking','studio','customer','settlement','media')`),
]);
