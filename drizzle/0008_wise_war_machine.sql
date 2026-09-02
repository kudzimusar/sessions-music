ALTER TABLE `uploads` ADD `studio_id` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `room_id` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `purpose` text;--> statement-breakpoint
ALTER TABLE `uploads` ADD `created_at` text;--> statement-breakpoint
CREATE INDEX `uploads_studio_purpose` ON `uploads` (`studio_id`,`purpose`);