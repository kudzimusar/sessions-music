CREATE TABLE IF NOT EXISTS corporate_staff_access_state (
  staff_id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','departed','terminated')),
  reason_code text,
  reason text,
  effective_at text NOT NULL,
  updated_by text NOT NULL,
  updated_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS corporate_staff_access_user_status ON corporate_staff_access_state(user_id,status,updated_at);
