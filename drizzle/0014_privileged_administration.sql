CREATE TABLE `corporate_privileged_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `identity_session_id` text NOT NULL,
  `status` text NOT NULL,
  `assurance_level` text NOT NULL,
  `purpose` text NOT NULL,
  `created_at` text NOT NULL,
  `expires_at` text NOT NULL,
  `revoked_at` text,
  `content` text NOT NULL,
  CONSTRAINT `privileged_session_status` CHECK (`status` IN ('active','revoked','expired')),
  CONSTRAINT `privileged_session_assurance` CHECK (`assurance_level` = 'aal2')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_privileged_session_per_user` ON `corporate_privileged_sessions` (`user_id`) WHERE `status` = 'active';
--> statement-breakpoint
CREATE INDEX `privileged_session_identity` ON `corporate_privileged_sessions` (`user_id`,`identity_session_id`,`status`,`expires_at`);
--> statement-breakpoint
CREATE TABLE `corporate_security_events` (
  `id` text PRIMARY KEY NOT NULL,
  `actor` text NOT NULL,
  `identity_session_id` text NOT NULL,
  `event` text NOT NULL,
  `target_type` text,
  `target_id` text,
  `created_at` text NOT NULL,
  `content` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `corporate_security_actor` ON `corporate_security_events` (`actor`,`created_at`);
--> statement-breakpoint
CREATE INDEX `corporate_security_target` ON `corporate_security_events` (`target_type`,`target_id`,`created_at`);
