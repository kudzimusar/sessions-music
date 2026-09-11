CREATE TABLE `corporate_access_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`due_at` text,
	`completed_at` text,
	`snapshot_count` integer NOT NULL,
	`content` text NOT NULL,
	CONSTRAINT "corporate_access_review_status_valid" CHECK("corporate_access_reviews"."status" IN ('open','completed','cancelled')),
	CONSTRAINT "corporate_access_review_snapshot_count" CHECK("corporate_access_reviews"."snapshot_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `corporate_access_review_status` ON `corporate_access_reviews` (`status`,`created_at`);
--> statement-breakpoint
CREATE TABLE `corporate_access_review_items` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`decision` text NOT NULL,
	`remediation_status` text NOT NULL,
	`reviewer` text,
	`reviewed_at` text,
	`remediated_at` text,
	`snapshot_granted_by` text,
	`snapshot_granted_at` text,
	`content` text NOT NULL,
	CONSTRAINT "corporate_access_review_decision" CHECK("corporate_access_review_items"."decision" IN ('pending','retain','revoke')),
	CONSTRAINT "corporate_access_review_remediation" CHECK("corporate_access_review_items"."remediation_status" IN ('not_required','pending','completed','failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corporate_access_review_subject_role` ON `corporate_access_review_items` (`review_id`,`user_id`,`role`);
--> statement-breakpoint
CREATE INDEX `corporate_access_review_items_review` ON `corporate_access_review_items` (`review_id`,`decision`,`remediation_status`);
--> statement-breakpoint
CREATE INDEX `corporate_access_review_items_subject` ON `corporate_access_review_items` (`user_id`,`role`);
