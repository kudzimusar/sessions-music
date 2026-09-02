CREATE TABLE `studio_calendar_events` (
	`booking_id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`event_id` text NOT NULL,
	`status` text NOT NULL,
	`updated_at` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "calendar_sync_status" CHECK("studio_calendar_events"."status" IN ('synced','awaiting_setup','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_event_id_unique` ON `studio_calendar_events` (`event_id`) WHERE "studio_calendar_events"."event_id" != '';