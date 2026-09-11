import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,uniqueIndex,index,check} from 'drizzle-orm/sqlite-core';

/**
 * Sessions workforce/organization records describe corporate structure only.
 * They deliberately contain no platform-role or permission grants; authority
 * continues to come from the trusted identity/RBAC boundary.
 */
export const corporateDepartments=sqliteTable('corporate_departments',{
 id:text('id').primaryKey(),
 code:text('code').notNull(),
 name:text('name').notNull(),
 parentDepartmentId:text('parent_department_id'),
 status:text('status').notNull(),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('corporate_department_code').on(t.code),
 index('corporate_department_parent').on(t.parentDepartmentId),
 check('corporate_department_status',sql`${t.status} IN ('active','inactive')`),
]);

export const corporatePositions=sqliteTable('corporate_positions',{
 id:text('id').primaryKey(),
 departmentId:text('department_id').notNull(),
 code:text('code').notNull(),
 title:text('title').notNull(),
 level:integer('level').notNull(),
 reportsToPositionId:text('reports_to_position_id'),
 isDepartmentHead:integer('is_department_head').notNull().default(0),
 status:text('status').notNull(),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('corporate_position_code').on(t.code),
 index('corporate_position_department').on(t.departmentId,t.status),
 index('corporate_position_parent').on(t.reportsToPositionId),
 check('corporate_position_level',sql`${t.level} >= 0`),
 check('corporate_position_head',sql`${t.isDepartmentHead} IN (0,1)`),
 check('corporate_position_status',sql`${t.status} IN ('active','inactive')`),
]);

export const corporateStaff=sqliteTable('corporate_staff',{
 id:text('id').primaryKey(),
 userId:text('user_id').notNull(),
 staffCode:text('staff_code').notNull(),
 positionId:text('position_id'),
 status:text('status').notNull(),
 startedAt:text('started_at'),
 endedAt:text('ended_at'),
 createdAt:text('created_at').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('corporate_staff_user').on(t.userId),
 uniqueIndex('corporate_staff_code').on(t.staffCode),
 index('corporate_staff_position').on(t.positionId,t.status),
 check('corporate_staff_status',sql`${t.status} IN ('invited','active','suspended','departed')`),
]);

export const corporateReportingLines=sqliteTable('corporate_reporting_lines',{
 id:text('id').primaryKey(),
 staffId:text('staff_id').notNull(),
 managerStaffId:text('manager_staff_id').notNull(),
 kind:text('kind').notNull(),
 status:text('status').notNull(),
 effectiveFrom:text('effective_from').notNull(),
 effectiveUntil:text('effective_until'),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull(),
},t=>[
 uniqueIndex('corporate_reporting_primary_active').on(t.staffId).where(sql`${t.kind} = 'primary' AND ${t.status} = 'active'`),
 index('corporate_reporting_manager').on(t.managerStaffId,t.status),
 check('corporate_reporting_not_self',sql`${t.staffId} != ${t.managerStaffId}`),
 check('corporate_reporting_kind',sql`${t.kind} IN ('primary','dotted')`),
 check('corporate_reporting_status',sql`${t.status} IN ('active','ended')`),
]);

export const corporateDelegations=sqliteTable('corporate_delegations',{
 id:text('id').primaryKey(),
 principalStaffId:text('principal_staff_id').notNull(),
 delegateStaffId:text('delegate_staff_id').notNull(),
 scope:text('scope').notNull(),
 status:text('status').notNull(),
 startsAt:text('starts_at').notNull(),
 endsAt:text('ends_at').notNull(),
 createdBy:text('created_by').notNull(),
 createdAt:text('created_at').notNull(),
 revokedAt:text('revoked_at'),
 content:text('content').notNull(),
},t=>[
 index('corporate_delegation_principal').on(t.principalStaffId,t.status,t.startsAt,t.endsAt),
 index('corporate_delegation_delegate').on(t.delegateStaffId,t.status,t.startsAt,t.endsAt),
 check('corporate_delegation_not_self',sql`${t.principalStaffId} != ${t.delegateStaffId}`),
 check('corporate_delegation_scope',sql`${t.scope} IN ('department','position','workflow','all')`),
 check('corporate_delegation_status',sql`${t.status} IN ('scheduled','active','revoked','expired')`),
]);

export const corporateOrgEvents=sqliteTable('corporate_org_events',{
 id:text('id').primaryKey(),
 actor:text('actor').notNull(),
 event:text('event').notNull(),
 entityType:text('entity_type').notNull(),
 entityId:text('entity_id').notNull(),
 createdAt:text('created_at').notNull(),
 content:text('content').notNull(),
},t=>[
 index('corporate_org_events_entity').on(t.entityType,t.entityId,t.createdAt),
 index('corporate_org_events_actor').on(t.actor,t.createdAt),
]);
