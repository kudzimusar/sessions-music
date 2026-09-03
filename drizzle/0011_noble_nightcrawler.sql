CREATE TABLE `booking_series` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`customer` text NOT NULL,
	`request_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "booking_series_status_valid" CHECK("booking_series"."status" IN ('requested','closed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_series_customer_key` ON `booking_series` (`customer`,`request_key`);--> statement-breakpoint
CREATE INDEX `booking_series_studio_created` ON `booking_series` (`studio_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `membership_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`membership_id` text,
	`customer` text NOT NULL,
	`booking_id` text,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`method` text,
	`idempotency_key` text NOT NULL,
	`occurred_at` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "membership_ledger_kind_valid" CHECK("membership_ledger"."kind" IN ('membership_settlement','attendance','loyalty_credit','loyalty_redemption','loyalty_reversal')),
	CONSTRAINT "membership_ledger_amount_valid" CHECK("membership_ledger"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_ledger_customer_key` ON `membership_ledger` (`customer`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `membership_ledger_booking_kind` ON `membership_ledger` (`booking_id`,`kind`) WHERE `booking_id` IS NOT NULL;--> statement-breakpoint
CREATE INDEX `membership_ledger_studio_time` ON `membership_ledger` (`studio_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `membership_ledger_membership_time` ON `membership_ledger` (`membership_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `loyalty_credit_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer NOT NULL,
	`credit_cents` integer NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "loyalty_credit_enabled_valid" CHECK("loyalty_credit_settings"."enabled" IN (0,1)),
	CONSTRAINT "loyalty_credit_amount_valid" CHECK("loyalty_credit_settings"."credit_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE `studio_loyalty_balances` (
	`studio_id` text NOT NULL,
	`customer` text NOT NULL,
	`balance_cents` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`studio_id`,`customer`),
	CONSTRAINT "studio_loyalty_balance_valid" CHECK("studio_loyalty_balances"."balance_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE `loyalty_credit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `loyalty_credit_actor_key` ON `loyalty_credit_events` (`actor`,`idempotency_key`);
