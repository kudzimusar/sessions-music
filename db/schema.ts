import {sql} from 'drizzle-orm';
import {sqliteTable,text,integer,primaryKey,uniqueIndex,check} from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces',{owner:text('owner').primaryKey(),content:text('content').notNull()});
export const rooms=sqliteTable('rooms',{owner:text('owner').notNull(),id:text('id').notNull(),content:text('content').notNull()},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const bookings=sqliteTable('bookings',{owner:text('owner').notNull(),id:text('id').notNull(),requestKey:text('request_key').notNull(),content:text('content').notNull()},t=>[primaryKey({columns:[t.owner,t.id]}),uniqueIndex('booking_request').on(t.owner,t.requestKey)]);
export const claims=sqliteTable('slot_claims',{owner:text('owner').notNull(),roomId:text('room_id').notNull(),date:text('date').notNull(),minute:integer('minute').notNull(),bookingId:text('booking_id').notNull()},t=>[primaryKey({columns:[t.owner,t.roomId,t.date,t.minute]})]);
export const blocks=sqliteTable('blocks',{owner:text('owner').notNull(),id:text('id').notNull(),content:text('content').notNull()},t=>[primaryKey({columns:[t.owner,t.id]})]);
export const uploads=sqliteTable('uploads',{id:text('id').primaryKey(),owner:text('owner').notNull(),type:text('type').notNull()});
export const guards=sqliteTable('operation_guards',{id:text('id').primaryKey(),valid:integer('valid').notNull()},t=>[check('guard_valid',sql`${t.valid} = 1`)]);
