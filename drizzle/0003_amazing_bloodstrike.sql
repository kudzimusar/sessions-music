CREATE TABLE `billing_accounts` (
	`studio_id` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_checkouts` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`owner` text NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `billing_events` (
	`provider` text NOT NULL,
	`id` text NOT NULL,
	PRIMARY KEY(`provider`, `id`)
);
--> statement-breakpoint
CREATE TABLE `planner_usage` (
	`actor` text NOT NULL,
	`day` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`actor`, `day`)
);
--> statement-breakpoint
CREATE TABLE `studio_members` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`customer` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_member_customer` ON `studio_members` (`studio_id`,`customer`);--> statement-breakpoint
CREATE TABLE `studio_registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`applicant` text NOT NULL,
	`status` text NOT NULL,
	`content` text NOT NULL
);
