CREATE TABLE `corporate_departments` (
  `id` text PRIMARY KEY NOT NULL,
  `code` text NOT NULL,
  `name` text NOT NULL,
  `parent_department_id` text,
  `status` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `corporate_department_status` CHECK (`status` IN ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_department_code` ON `corporate_departments` (`code`);
--> statement-breakpoint
CREATE INDEX `corporate_department_parent` ON `corporate_departments` (`parent_department_id`);
--> statement-breakpoint
CREATE TABLE `corporate_positions` (
  `id` text PRIMARY KEY NOT NULL,
  `department_id` text NOT NULL,
  `code` text NOT NULL,
  `title` text NOT NULL,
  `level` integer NOT NULL,
  `reports_to_position_id` text,
  `is_department_head` integer DEFAULT 0 NOT NULL,
  `status` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `corporate_position_level` CHECK (`level` >= 0),
  CONSTRAINT `corporate_position_head` CHECK (`is_department_head` IN (0,1)),
  CONSTRAINT `corporate_position_status` CHECK (`status` IN ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_position_code` ON `corporate_positions` (`code`);
--> statement-breakpoint
CREATE INDEX `corporate_position_department` ON `corporate_positions` (`department_id`,`status`);
--> statement-breakpoint
CREATE INDEX `corporate_position_parent` ON `corporate_positions` (`reports_to_position_id`);
--> statement-breakpoint
CREATE TABLE `corporate_staff` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `staff_code` text NOT NULL,
  `position_id` text,
  `status` text NOT NULL,
  `started_at` text,
  `ended_at` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `corporate_staff_status` CHECK (`status` IN ('invited','active','suspended','departed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_staff_user` ON `corporate_staff` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_staff_code` ON `corporate_staff` (`staff_code`);
--> statement-breakpoint
CREATE INDEX `corporate_staff_position` ON `corporate_staff` (`position_id`,`status`);
--> statement-breakpoint
CREATE TABLE `corporate_reporting_lines` (
  `id` text PRIMARY KEY NOT NULL,
  `staff_id` text NOT NULL,
  `manager_staff_id` text NOT NULL,
  `kind` text NOT NULL,
  `status` text NOT NULL,
  `effective_from` text NOT NULL,
  `effective_until` text,
  `created_at` text NOT NULL,
  `content` text NOT NULL,
  CONSTRAINT `corporate_reporting_not_self` CHECK (`staff_id` != `manager_staff_id`),
  CONSTRAINT `corporate_reporting_kind` CHECK (`kind` IN ('primary','dotted')),
  CONSTRAINT `corporate_reporting_status` CHECK (`status` IN ('active','ended'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_reporting_primary_active` ON `corporate_reporting_lines` (`staff_id`) WHERE `kind` = 'primary' AND `status` = 'active';
--> statement-breakpoint
CREATE INDEX `corporate_reporting_manager` ON `corporate_reporting_lines` (`manager_staff_id`,`status`);
--> statement-breakpoint
CREATE TABLE `corporate_delegations` (
  `id` text PRIMARY KEY NOT NULL,
  `principal_staff_id` text NOT NULL,
  `delegate_staff_id` text NOT NULL,
  `scope` text NOT NULL,
  `status` text NOT NULL,
  `starts_at` text NOT NULL,
  `ends_at` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  `revoked_at` text,
  `content` text NOT NULL,
  CONSTRAINT `corporate_delegation_not_self` CHECK (`principal_staff_id` != `delegate_staff_id`),
  CONSTRAINT `corporate_delegation_scope` CHECK (`scope` IN ('department','position','workflow','all')),
  CONSTRAINT `corporate_delegation_status` CHECK (`status` IN ('scheduled','active','revoked','expired'))
);
--> statement-breakpoint
CREATE INDEX `corporate_delegation_principal` ON `corporate_delegations` (`principal_staff_id`,`status`,`starts_at`,`ends_at`);
--> statement-breakpoint
CREATE INDEX `corporate_delegation_delegate` ON `corporate_delegations` (`delegate_staff_id`,`status`,`starts_at`,`ends_at`);
--> statement-breakpoint
CREATE TABLE `corporate_org_events` (
  `id` text PRIMARY KEY NOT NULL,
  `actor` text NOT NULL,
  `event` text NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` text NOT NULL,
  `created_at` text NOT NULL,
  `content` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `corporate_org_events_entity` ON `corporate_org_events` (`entity_type`,`entity_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `corporate_org_events_actor` ON `corporate_org_events` (`actor`,`created_at`);
