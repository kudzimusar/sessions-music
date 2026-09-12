-- Phase 4 corporate control-plane read optimization.
-- These indexes accelerate projections over canonical marketplace tables; no data is copied.
CREATE INDEX IF NOT EXISTS `studio_bookings_status_created`
ON `studio_bookings` (json_extract(`content`,'$.status'), json_extract(`content`,'$.createdAt'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `studio_bookings_date_status`
ON `studio_bookings` (json_extract(`content`,'$.date'), json_extract(`content`,'$.status'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `studio_bookings_customer_created`
ON `studio_bookings` (`customer`, json_extract(`content`,'$.createdAt'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `studio_members_status_created`
ON `studio_members` (json_extract(`content`,'$.status'), json_extract(`content`,'$.createdAt'));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `studio_issues_status_created`
ON `studio_issues` (json_extract(`content`,'$.status'), json_extract(`content`,'$.createdAt'));
