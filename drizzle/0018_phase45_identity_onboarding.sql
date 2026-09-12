CREATE TABLE IF NOT EXISTS sessions_user_profiles (
  user_id text PRIMARY KEY NOT NULL,
  status text NOT NULL DEFAULT 'identity_verified' CHECK(status IN ('identity_verified','profile_required','consent_required','active','restricted','suspended','deletion_pending','terminated')),
  display_name text,
  market text NOT NULL DEFAULT 'ZW',
  locale text NOT NULL DEFAULT 'en-ZW',
  last_context_type text CHECK(last_context_type IS NULL OR last_context_type IN ('personal','provider','corporate')),
  last_context_id text,
  created_at text NOT NULL,
  updated_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_user_profile_status ON sessions_user_profiles(status,updated_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions_user_contacts (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('email','phone','whatsapp')),
  value text NOT NULL,
  is_primary integer NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  verified_at text,
  source text NOT NULL CHECK(source IN ('identity_provider','user')),
  consent_status text NOT NULL DEFAULT 'not_applicable' CHECK(consent_status IN ('not_applicable','pending','opted_in','opted_out')),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_contact_user_kind_value ON sessions_user_contacts(user_id,kind,value);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_contact_user_kind ON sessions_user_contacts(user_id,kind);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions_consents (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  consent_type text NOT NULL,
  document_version text NOT NULL,
  decision text NOT NULL CHECK(decision IN ('granted','declined','withdrawn')),
  channel text NOT NULL CHECK(channel IN ('web','pwa','ios','android','corporate')),
  source text NOT NULL,
  idempotency_key text NOT NULL,
  occurred_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_consent_user_key ON sessions_consents(user_id,idempotency_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_consent_user_type_time ON sessions_consents(user_id,consent_type,occurred_at);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_consents_no_update BEFORE UPDATE ON sessions_consents BEGIN SELECT RAISE(ABORT,'consent ledger is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_consents_no_delete BEFORE DELETE ON sessions_consents BEGIN SELECT RAISE(ABORT,'consent ledger is append-only'); END;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions_onboarding_journeys (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL,
  journey text NOT NULL CHECK(journey IN ('customer','provider','corporate')),
  context_key text NOT NULL DEFAULT '',
  status text NOT NULL CHECK(status IN ('identity_verified','profile_required','consent_required','active','draft','submitted','under_review','changes_requested','approved','rejected','invited','accepted','security_setup_required','restricted','suspended','departed','deletion_pending','terminated')),
  current_step text NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  started_at text NOT NULL,
  updated_at text NOT NULL,
  completed_at text,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_onboarding_user_journey_context ON sessions_onboarding_journeys(user_id,journey,context_key);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_onboarding_user_status ON sessions_onboarding_journeys(user_id,status,updated_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions_continuation_intents (
  digest text PRIMARY KEY NOT NULL,
  user_id text,
  kind text NOT NULL,
  return_path text NOT NULL CHECK(return_path LIKE '/%' AND return_path NOT LIKE '//%'),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','consumed','expired','cancelled')),
  created_at text NOT NULL,
  expires_at text NOT NULL,
  consumed_at text,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_continuation_user_status ON sessions_continuation_intents(user_id,status,expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS sessions_user_lifecycle_events (
  id text PRIMARY KEY NOT NULL,
  actor_user_id text NOT NULL,
  target_user_id text NOT NULL,
  event text NOT NULL,
  context_type text NOT NULL CHECK(context_type IN ('identity','customer','provider','corporate')),
  context_id text,
  reason_code text,
  created_at text NOT NULL,
  content text NOT NULL DEFAULT '{}'
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_lifecycle_target_time ON sessions_user_lifecycle_events(target_user_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_lifecycle_context_time ON sessions_user_lifecycle_events(context_type,context_id,created_at);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_lifecycle_no_update BEFORE UPDATE ON sessions_user_lifecycle_events BEGIN SELECT RAISE(ABORT,'lifecycle events are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_lifecycle_no_delete BEFORE DELETE ON sessions_user_lifecycle_events BEGIN SELECT RAISE(ABORT,'lifecycle events are append-only'); END;
