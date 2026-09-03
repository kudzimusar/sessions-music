CREATE TABLE `booking_vouchers` (
  `id` text PRIMARY KEY NOT NULL,
  `booking_id` text NOT NULL,
  `studio_id` text NOT NULL,
  `token` text NOT NULL,
  `status` text NOT NULL,
  `created_at` text NOT NULL,
  `revoked_at` text,
  `content` text NOT NULL,
  CONSTRAINT `booking_voucher_status_valid` CHECK(`booking_vouchers`.`status` IN ('active','revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_voucher_booking` ON `booking_vouchers` (`booking_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_voucher_token` ON `booking_vouchers` (`token`);
--> statement-breakpoint
CREATE INDEX `booking_voucher_studio` ON `booking_vouchers` (`studio_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `booking_messages` (
  `id` text PRIMARY KEY NOT NULL,
  `booking_id` text NOT NULL,
  `studio_id` text NOT NULL,
  `sender` text NOT NULL,
  `sender_side` text NOT NULL,
  `recipient` text NOT NULL,
  `attachment_media_id` text,
  `idempotency_key` text NOT NULL,
  `created_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `booking_message_sender_side_valid` CHECK(`booking_messages`.`sender_side` IN ('musician','studio'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_message_sender_key` ON `booking_messages` (`sender`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `booking_messages_booking_time` ON `booking_messages` (`booking_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `booking_messages_recipient_time` ON `booking_messages` (`recipient`,`created_at`);
--> statement-breakpoint
CREATE TABLE `booking_message_reads` (
  `booking_id` text NOT NULL,
  `recipient` text NOT NULL,
  `last_read_at` text NOT NULL,
  PRIMARY KEY(`booking_id`,`recipient`)
);
--> statement-breakpoint
CREATE INDEX `booking_message_reads_recipient` ON `booking_message_reads` (`recipient`,`last_read_at`);
--> statement-breakpoint
CREATE TABLE `booking_notification_preferences` (
  `recipient` text PRIMARY KEY NOT NULL,
  `email` text NOT NULL,
  `email_consent` integer NOT NULL,
  `reminder_consent` integer NOT NULL,
  `revision` integer DEFAULT 0 NOT NULL,
  `updated_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `booking_notification_email_consent_valid` CHECK(`booking_notification_preferences`.`email_consent` IN (0,1)),
  CONSTRAINT `booking_notification_reminder_consent_valid` CHECK(`booking_notification_preferences`.`reminder_consent` IN (0,1))
);
--> statement-breakpoint
CREATE TABLE `booking_notifications` (
  `id` text PRIMARY KEY NOT NULL,
  `booking_id` text NOT NULL,
  `studio_id` text NOT NULL,
  `recipient` text NOT NULL,
  `channel` text NOT NULL,
  `kind` text NOT NULL,
  `status` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `scheduled_at` text,
  `created_at` text NOT NULL,
  `sent_at` text,
  `attempts` integer DEFAULT 0 NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `booking_notification_channel_valid` CHECK(`booking_notifications`.`channel` IN ('in_app','email','whatsapp')),
  CONSTRAINT `booking_notification_status_valid` CHECK(`booking_notifications`.`status` IN ('available','pending','sending','delivered','skipped','failed','user_opened'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_notification_recipient_key` ON `booking_notifications` (`recipient`,`idempotency_key`);
--> statement-breakpoint
CREATE INDEX `booking_notifications_recipient_time` ON `booking_notifications` (`recipient`,`created_at`);
--> statement-breakpoint
CREATE INDEX `booking_notifications_booking_kind` ON `booking_notifications` (`booking_id`,`kind`);
--> statement-breakpoint
CREATE TABLE `booking_notification_preference_events` (
  `id` text PRIMARY KEY NOT NULL,
  `recipient` text NOT NULL,
  `idempotency_key` text NOT NULL,
  `created_at` text NOT NULL,
  `content` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_notification_preference_recipient_key` ON `booking_notification_preference_events` (`recipient`,`idempotency_key`);
