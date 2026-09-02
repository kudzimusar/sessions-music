CREATE TABLE `blocks` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`request_key` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_request` ON `bookings` (`owner`,`request_key`);--> statement-breakpoint
CREATE TABLE `slot_claims` (
	`owner` text NOT NULL,
	`room_id` text NOT NULL,
	`date` text NOT NULL,
	`minute` integer NOT NULL,
	`booking_id` text NOT NULL,
	PRIMARY KEY(`owner`, `room_id`, `date`, `minute`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL
);
