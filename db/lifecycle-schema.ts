import {sql} from 'drizzle-orm';
import {sqliteTable,text,index,check} from 'drizzle-orm/sqlite-core';

export const corporateStaffAccessState=sqliteTable('corporate_staff_access_state',{
 staffId:text('staff_id').primaryKey(),
 userId:text('user_id').notNull(),
 status:text('status').notNull().default('active'),
 reasonCode:text('reason_code'),
 reason:text('reason'),
 effectiveAt:text('effective_at').notNull(),
 updatedBy:text('updated_by').notNull(),
 updatedAt:text('updated_at').notNull(),
 content:text('content').notNull().default('{}'),
},t=>[
 index('corporate_staff_access_user_status').on(t.userId,t.status,t.updatedAt),
 check('corporate_staff_access_status_valid',sql`${t.status} IN ('active','suspended','departed','terminated')`),
]);
