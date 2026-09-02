CREATE TABLE `operation_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "guard_valid" CHECK("operation_guards"."valid" = 1)
);
