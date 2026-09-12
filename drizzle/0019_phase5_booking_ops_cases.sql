CREATE TABLE IF NOT EXISTS booking_operation_state (
  booking_id text PRIMARY KEY NOT NULL,
  studio_id text NOT NULL,
  operational_state text NOT NULL DEFAULT 'normal' CHECK(operational_state IN ('normal','attention','intervention','waiting_customer','waiting_provider','waiting_internal','resolved')),
  priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  assigned_to text,
  assigned_team text,
  next_action_at text,
  sla_state text NOT NULL DEFAULT 'on_track' CHECK(sla_state IN ('on_track','due_soon','breached','paused','complete')),
  revision integer NOT NULL DEFAULT 0,
  updated_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_ops_studio_state ON booking_operation_state(studio_id,operational_state,updated_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_ops_assignment ON booking_operation_state(assigned_team,assigned_to,next_action_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_ops_sla ON booking_operation_state(sla_state,next_action_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS booking_operation_events (
  id text PRIMARY KEY NOT NULL,
  booking_id text NOT NULL,
  studio_id text NOT NULL,
  actor text NOT NULL,
  event text NOT NULL,
  reason_code text,
  case_id text,
  idempotency_key text NOT NULL,
  created_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS booking_ops_event_actor_key ON booking_operation_events(actor,idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_ops_events_booking_time ON booking_operation_events(booking_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS booking_ops_events_case_time ON booking_operation_events(case_id,created_at);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_events_no_update BEFORE UPDATE ON booking_operation_events BEGIN SELECT RAISE(ABORT,'booking operation events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS booking_operation_events_no_delete BEFORE DELETE ON booking_operation_events BEGIN SELECT RAISE(ABORT,'booking operation events are append-only'); END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS operational_cases (
  id text PRIMARY KEY NOT NULL,
  reference text NOT NULL,
  category text NOT NULL CHECK(category IN ('customer_support','booking_operations','provider_operations','trust_safety','finance','general_incident')),
  severity text NOT NULL DEFAULT 'medium' CHECK(severity IN ('low','medium','high','critical')),
  priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','triaged','in_progress','waiting_customer','waiting_provider','waiting_internal','resolved','closed')),
  source text NOT NULL,
  reporter text NOT NULL,
  assigned_to text,
  assigned_team text,
  booking_id text,
  studio_id text,
  customer text,
  settlement_id text,
  classification text NOT NULL DEFAULT 'internal' CHECK(classification IN ('internal','restricted','confidential')),
  sla_target_at text,
  next_action_at text,
  resolution_code text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  resolved_at text,
  closed_at text,
  revision integer NOT NULL DEFAULT 0,
  content text NOT NULL DEFAULT '{}',
  CHECK(status NOT IN ('resolved','closed') OR resolved_at IS NOT NULL),
  CHECK(status != 'closed' OR closed_at IS NOT NULL),
  CHECK(status NOT IN ('resolved','closed') OR (resolution_code IS NOT NULL AND length(trim(resolution_code)) > 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS operational_case_reference ON operational_cases(reference);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_cases_queue ON operational_cases(status,priority,next_action_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_cases_booking ON operational_cases(booking_id,status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_cases_studio ON operational_cases(studio_id,status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_cases_customer ON operational_cases(customer,status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_cases_category_team ON operational_cases(category,assigned_team,status);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS operational_case_events (
  id text PRIMARY KEY NOT NULL,
  case_id text NOT NULL,
  actor text NOT NULL,
  event text NOT NULL,
  visibility text NOT NULL DEFAULT 'internal' CHECK(visibility IN ('internal','customer','provider')),
  classification text NOT NULL DEFAULT 'internal' CHECK(classification IN ('internal','restricted','confidential')),
  evidence_media_id text,
  idempotency_key text NOT NULL,
  created_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS operational_case_event_actor_key ON operational_case_events(actor,idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_case_events_case_time ON operational_case_events(case_id,created_at);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_events_no_update BEFORE UPDATE ON operational_case_events BEGIN SELECT RAISE(ABORT,'case events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS operational_case_events_no_delete BEFORE DELETE ON operational_case_events BEGIN SELECT RAISE(ABORT,'case events are append-only'); END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS operational_case_links (
  id text PRIMARY KEY NOT NULL,
  case_id text NOT NULL,
  object_type text NOT NULL CHECK(object_type IN ('booking','studio','customer','settlement','media')),
  object_id text NOT NULL,
  created_by text NOT NULL,
  created_at text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS operational_case_link_unique ON operational_case_links(case_id,object_type,object_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS operational_case_link_object ON operational_case_links(object_type,object_id);
