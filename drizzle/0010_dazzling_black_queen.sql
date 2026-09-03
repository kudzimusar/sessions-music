CREATE TABLE `fee_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`studio_id` text,
	`room_id` text,
	`status` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_until` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "fee_policy_scope_valid" CHECK("fee_policies"."scope" IN ('global','room')),
	CONSTRAINT "fee_policy_status_valid" CHECK("fee_policies"."status" IN ('active','retired')),
	CONSTRAINT "fee_policy_scope_target" CHECK(("fee_policies"."scope" = 'global' AND "fee_policies"."studio_id" IS NULL AND "fee_policies"."room_id" IS NULL) OR ("fee_policies"."scope" = 'room' AND "fee_policies"."studio_id" IS NOT NULL AND "fee_policies"."room_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `fee_policy_effective_lookup` ON `fee_policies` (`scope`,`studio_id`,`room_id`,`status`,`effective_from`,`effective_until`);--> statement-breakpoint
CREATE TABLE `fee_policy_events` (
	`id` text PRIMARY KEY NOT NULL,
	`policy_id` text NOT NULL,
	`actor` text NOT NULL,
	`event` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text NOT NULL,
	`content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fee_policy_actor_idempotency` ON `fee_policy_events` (`actor`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `fee_policy_events_policy` ON `fee_policy_events` (`policy_id`,`created_at`);
