CREATE TABLE `studio_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`customer` text NOT NULL,
	`request_key` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_booking_key` ON `studio_bookings` (`customer`,`request_key`);--> statement-breakpoint
CREATE TABLE `studio_claim_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`applicant` text NOT NULL,
	`status` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_claim_applicant` ON `studio_claim_requests` (`studio_id`,`applicant`);--> statement-breakpoint
CREATE TABLE `studio_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_registry` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `studio_booking_slots` (
	`studio_id` text NOT NULL,
	`room_id` text NOT NULL,
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`booking_id` text NOT NULL,
	PRIMARY KEY(`studio_id`, `room_id`, `date`, `minute`)
);
--> statement-breakpoint
CREATE TABLE `studio_staff` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`email` text NOT NULL,
	`status` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_staff_email` ON `studio_staff` (`studio_id`,`email`);