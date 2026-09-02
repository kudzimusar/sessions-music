CREATE TABLE `studio_verification_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`applicant` text NOT NULL,
	`status` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_verification_pending` ON `studio_verification_requests` (`studio_id`) WHERE "studio_verification_requests"."status" = 'pending';