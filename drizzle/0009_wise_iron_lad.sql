CREATE TABLE `settlement_events` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`studio_id` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settlement_actor_idempotency` ON `settlement_events` (`actor`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `settlement_events_settlement` ON `settlement_events` (`settlement_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `studio_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`studio_id` text NOT NULL,
	`period` text NOT NULL,
	`status` text NOT NULL,
	`gross_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`studio_net_cents` integer NOT NULL,
	`issued_at` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "studio_invoice_status" CHECK("studio_invoices"."status" = 'issued'),
	CONSTRAINT "studio_invoice_arithmetic" CHECK("studio_invoices"."gross_cents" >= 0 AND "studio_invoices"."platform_fee_cents" >= 0 AND "studio_invoices"."studio_net_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studio_invoice_period` ON `studio_invoices` (`studio_id`,`period`);--> statement-breakpoint
CREATE TABLE `studio_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`studio_id` text NOT NULL,
	`customer` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`room_subtotal_cents` integer NOT NULL,
	`addon_subtotal_cents` integer NOT NULL,
	`gross_cents` integer NOT NULL,
	`customer_fee_cents` integer NOT NULL,
	`studio_fee_cents` integer NOT NULL,
	`platform_fee_cents` integer NOT NULL,
	`customer_total_cents` integer NOT NULL,
	`deposit_due_cents` integer NOT NULL,
	`studio_net_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`settled_month` text,
	`settled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "settlement_status_valid" CHECK("studio_settlements"."status" IN ('awaiting_payment','proof_submitted','payment_declined','settled_off_platform','disputed','cancelled')),
	CONSTRAINT "settlement_currency_usd" CHECK("studio_settlements"."currency" = 'USD'),
	CONSTRAINT "settlement_integer_arithmetic" CHECK("studio_settlements"."room_subtotal_cents" >= 0 AND "studio_settlements"."addon_subtotal_cents" >= 0 AND "studio_settlements"."gross_cents" = "studio_settlements"."room_subtotal_cents" + "studio_settlements"."addon_subtotal_cents" AND "studio_settlements"."customer_fee_cents" >= 0 AND "studio_settlements"."studio_fee_cents" >= 0 AND "studio_settlements"."platform_fee_cents" = "studio_settlements"."customer_fee_cents" + "studio_settlements"."studio_fee_cents" AND "studio_settlements"."customer_total_cents" = "studio_settlements"."gross_cents" + "studio_settlements"."customer_fee_cents" AND "studio_settlements"."studio_net_cents" = "studio_settlements"."gross_cents" - "studio_settlements"."studio_fee_cents" AND "studio_settlements"."deposit_due_cents" >= 0 AND "studio_settlements"."deposit_due_cents" <= "studio_settlements"."customer_total_cents")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settlement_booking_unique` ON `studio_settlements` (`booking_id`);--> statement-breakpoint
CREATE INDEX `settlement_studio_month` ON `studio_settlements` (`studio_id`,`settled_month`);--> statement-breakpoint
CREATE INDEX `settlement_customer_status` ON `studio_settlements` (`customer`,`status`);--> statement-breakpoint
ALTER TABLE `uploads` ADD `booking_id` text;--> statement-breakpoint
CREATE INDEX `uploads_booking_purpose` ON `uploads` (`booking_id`,`purpose`);