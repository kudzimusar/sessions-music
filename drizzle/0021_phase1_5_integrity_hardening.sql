ALTER TABLE uploads ADD case_id text;
--> statement-breakpoint
UPDATE uploads
SET case_id=(
  SELECT l.case_id
  FROM operational_case_links l
  WHERE l.object_type='media' AND l.object_id=uploads.id
  ORDER BY l.created_at ASC
  LIMIT 1
)
WHERE purpose='case_evidence' AND case_id IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS uploads_case_purpose ON uploads(case_id,purpose);
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS corporate_org_events_no_update BEFORE UPDATE ON corporate_org_events BEGIN SELECT RAISE(ABORT,'corporate organization events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS corporate_org_events_no_delete BEFORE DELETE ON corporate_org_events BEGIN SELECT RAISE(ABORT,'corporate organization events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS corporate_security_events_no_update BEFORE UPDATE ON corporate_security_events BEGIN SELECT RAISE(ABORT,'corporate security events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS corporate_security_events_no_delete BEFORE DELETE ON corporate_security_events BEGIN SELECT RAISE(ABORT,'corporate security events are append-only'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS corporate_staff_access_parent_insert
BEFORE INSERT ON corporate_staff_access_state
WHEN NOT EXISTS (SELECT 1 FROM corporate_staff s WHERE s.id=NEW.staff_id AND s.user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'staff access state must match the canonical workforce identity'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS corporate_staff_access_parent_update
BEFORE UPDATE OF staff_id,user_id ON corporate_staff_access_state
WHEN NOT EXISTS (SELECT 1 FROM corporate_staff s WHERE s.id=NEW.staff_id AND s.user_id=NEW.user_id)
BEGIN SELECT RAISE(ABORT,'staff access state must match the canonical workforce identity'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS corporate_staff_access_terminal_update
BEFORE UPDATE OF status ON corporate_staff_access_state
WHEN (OLD.status='terminated' AND NEW.status!='terminated') OR (OLD.status='departed' AND NEW.status='active')
BEGIN SELECT RAISE(ABORT,'terminal staff lifecycle state requires a new reviewed employment record'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS booking_operation_state_parent_insert
BEFORE INSERT ON booking_operation_state
WHEN NOT EXISTS (SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id AND b.studio_id=NEW.studio_id)
BEGIN SELECT RAISE(ABORT,'booking operations state must reference the canonical booking and studio'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_state_parent_update
BEFORE UPDATE OF booking_id,studio_id ON booking_operation_state
WHEN NOT EXISTS (SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id AND b.studio_id=NEW.studio_id)
BEGIN SELECT RAISE(ABORT,'booking operations state must reference the canonical booking and studio'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_state_revision
BEFORE UPDATE ON booking_operation_state
WHEN NEW.revision != OLD.revision + 1
BEGIN SELECT RAISE(ABORT,'booking operations revision must advance exactly once'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_events_parent
BEFORE INSERT ON booking_operation_events
WHEN NOT EXISTS (SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id AND b.studio_id=NEW.studio_id)
BEGIN SELECT RAISE(ABORT,'booking operation event must reference the canonical booking and studio'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_events_case_parent
BEFORE INSERT ON booking_operation_events
WHEN NEW.case_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM operational_cases c
  WHERE c.id=NEW.case_id AND (c.booking_id IS NULL OR c.booking_id=NEW.booking_id)
)
BEGIN SELECT RAISE(ABORT,'booking operation case event must reference a compatible case'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS operational_cases_booking_parent_insert
BEFORE INSERT ON operational_cases
WHEN NEW.booking_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id)
BEGIN SELECT RAISE(ABORT,'case booking link must reference a canonical booking'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_studio_parent_insert
BEFORE INSERT ON operational_cases
WHEN NEW.studio_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM studio_registry s WHERE s.id=NEW.studio_id)
BEGIN SELECT RAISE(ABORT,'case studio link must reference a canonical studio'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_customer_parent_insert
BEFORE INSERT ON operational_cases
WHEN NEW.customer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessions_user_profiles p WHERE p.user_id=NEW.customer)
BEGIN SELECT RAISE(ABORT,'case customer link must reference a Sessions profile'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_settlement_parent_insert
BEFORE INSERT ON operational_cases
WHEN NEW.settlement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM studio_settlements s WHERE s.id=NEW.settlement_id)
BEGIN SELECT RAISE(ABORT,'case settlement link must reference a canonical settlement'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_booking_studio_consistency
BEFORE INSERT ON operational_cases
WHEN NEW.booking_id IS NOT NULL AND NEW.studio_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id AND b.studio_id=NEW.studio_id
)
BEGIN SELECT RAISE(ABORT,'case booking and studio links must describe the same canonical booking'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_booking_customer_consistency
BEFORE INSERT ON operational_cases
WHEN NEW.booking_id IS NOT NULL AND NEW.customer IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM studio_bookings b WHERE b.id=NEW.booking_id AND b.customer=NEW.customer
)
BEGIN SELECT RAISE(ABORT,'case booking and customer links must describe the same canonical booking'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_settlement_consistency
BEFORE INSERT ON operational_cases
WHEN NEW.settlement_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM studio_settlements s
  WHERE s.id=NEW.settlement_id
    AND (NEW.booking_id IS NULL OR s.booking_id=NEW.booking_id)
    AND (NEW.studio_id IS NULL OR s.studio_id=NEW.studio_id)
    AND (NEW.customer IS NULL OR s.customer=NEW.customer)
)
BEGIN SELECT RAISE(ABORT,'case settlement links must agree with linked booking, studio and customer'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_revision
BEFORE UPDATE ON operational_cases
WHEN NEW.revision != OLD.revision + 1
BEGIN SELECT RAISE(ABORT,'case revision must advance exactly once'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_cases_status_transition
BEFORE UPDATE OF status ON operational_cases
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status='open' AND NEW.status='triaged') OR
  (OLD.status='triaged' AND NEW.status IN ('in_progress','waiting_customer','waiting_provider','waiting_internal','resolved')) OR
  (OLD.status='in_progress' AND NEW.status IN ('waiting_customer','waiting_provider','waiting_internal','resolved')) OR
  (OLD.status='waiting_customer' AND NEW.status IN ('in_progress','waiting_provider','waiting_internal','resolved')) OR
  (OLD.status='waiting_provider' AND NEW.status IN ('in_progress','waiting_customer','waiting_internal','resolved')) OR
  (OLD.status='waiting_internal' AND NEW.status IN ('in_progress','waiting_customer','waiting_provider','resolved')) OR
  (OLD.status='resolved' AND NEW.status IN ('closed','in_progress')) OR
  (OLD.status='closed' AND NEW.status='in_progress')
)
BEGIN SELECT RAISE(ABORT,'invalid operational case status transition'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS operational_case_events_parent
BEFORE INSERT ON operational_case_events
WHEN NOT EXISTS (SELECT 1 FROM operational_cases c WHERE c.id=NEW.case_id)
BEGIN SELECT RAISE(ABORT,'case event must reference an existing case'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_events_evidence_parent
BEFORE INSERT ON operational_case_events
WHEN NEW.evidence_media_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM uploads u
  WHERE u.id=NEW.evidence_media_id AND u.purpose='case_evidence' AND u.case_id=NEW.case_id
)
BEGIN SELECT RAISE(ABORT,'case evidence event must reference evidence bound to the same case'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS operational_case_links_case_parent
BEFORE INSERT ON operational_case_links
WHEN NOT EXISTS (SELECT 1 FROM operational_cases c WHERE c.id=NEW.case_id)
BEGIN SELECT RAISE(ABORT,'case link must reference an existing case'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_booking_parent
BEFORE INSERT ON operational_case_links
WHEN NEW.object_type='booking' AND NOT EXISTS (SELECT 1 FROM studio_bookings b WHERE b.id=NEW.object_id)
BEGIN SELECT RAISE(ABORT,'case booking link must reference a canonical booking'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_studio_parent
BEFORE INSERT ON operational_case_links
WHEN NEW.object_type='studio' AND NOT EXISTS (SELECT 1 FROM studio_registry s WHERE s.id=NEW.object_id)
BEGIN SELECT RAISE(ABORT,'case studio link must reference a canonical studio'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_customer_parent
BEFORE INSERT ON operational_case_links
WHEN NEW.object_type='customer' AND NOT EXISTS (SELECT 1 FROM sessions_user_profiles p WHERE p.user_id=NEW.object_id)
BEGIN SELECT RAISE(ABORT,'case customer link must reference a Sessions profile'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_settlement_parent
BEFORE INSERT ON operational_case_links
WHEN NEW.object_type='settlement' AND NOT EXISTS (SELECT 1 FROM studio_settlements s WHERE s.id=NEW.object_id)
BEGIN SELECT RAISE(ABORT,'case settlement link must reference a canonical settlement'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_media_parent
BEFORE INSERT ON operational_case_links
WHEN NEW.object_type='media' AND NOT EXISTS (
  SELECT 1 FROM uploads u WHERE u.id=NEW.object_id AND u.purpose='case_evidence' AND u.case_id=NEW.case_id
)
BEGIN SELECT RAISE(ABORT,'case media link must reference evidence bound to the same case'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_no_update BEFORE UPDATE ON operational_case_links BEGIN SELECT RAISE(ABORT,'case links are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_links_no_delete BEFORE DELETE ON operational_case_links BEGIN SELECT RAISE(ABORT,'case links are append-only'); END;
--> statement-breakpoint

CREATE TRIGGER IF NOT EXISTS uploads_case_evidence_parent_insert
BEFORE INSERT ON uploads
WHEN NEW.purpose='case_evidence' AND (NEW.case_id IS NULL OR NOT EXISTS (SELECT 1 FROM operational_cases c WHERE c.id=NEW.case_id))
BEGIN SELECT RAISE(ABORT,'case evidence must be bound to an existing case'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS uploads_case_evidence_parent_update
BEFORE UPDATE OF purpose,case_id ON uploads
WHEN NEW.purpose='case_evidence' AND (NEW.case_id IS NULL OR NOT EXISTS (SELECT 1 FROM operational_cases c WHERE c.id=NEW.case_id))
BEGIN SELECT RAISE(ABORT,'case evidence must be bound to an existing case'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS uploads_non_case_evidence_scope_insert
BEFORE INSERT ON uploads
WHEN (NEW.purpose IS NULL OR NEW.purpose!='case_evidence') AND NEW.case_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'non-case uploads cannot carry a case scope'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS uploads_non_case_evidence_scope_update
BEFORE UPDATE OF purpose,case_id ON uploads
WHEN (NEW.purpose IS NULL OR NEW.purpose!='case_evidence') AND NEW.case_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'non-case uploads cannot carry a case scope'); END;
