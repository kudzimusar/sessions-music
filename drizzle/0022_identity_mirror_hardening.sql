-- Phase 4.5 identity mirror hardening.
-- Supabase Auth remains authoritative; D1 must not become an ambiguous parallel
-- identity source when it mirrors verified email/phone contacts.

UPDATE sessions_user_contacts
SET is_primary=0,updated_at=updated_at
WHERE id IN (
  SELECT id FROM (
    SELECT id,row_number() OVER (
      PARTITION BY user_id,kind
      ORDER BY verified_at DESC,updated_at DESC,id DESC
    ) rn
    FROM sessions_user_contacts
    WHERE is_primary=1
  ) ranked
  WHERE rn>1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_contact_one_primary_kind
  ON sessions_user_contacts(user_id,kind)
  WHERE is_primary=1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS sessions_verified_identity_contact_unique
  ON sessions_user_contacts(kind,value)
  WHERE source='identity_provider' AND kind IN ('email','phone');
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_identity_contact_trusted_insert
BEFORE INSERT ON sessions_user_contacts
WHEN NEW.kind IN ('email','phone') AND (NEW.source!='identity_provider' OR NEW.verified_at IS NULL)
BEGIN SELECT RAISE(ABORT,'email and phone identity contacts must come from the verified identity provider'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS sessions_identity_contact_trusted_update
BEFORE UPDATE OF kind,source,verified_at ON sessions_user_contacts
WHEN NEW.kind IN ('email','phone') AND (NEW.source!='identity_provider' OR NEW.verified_at IS NULL)
BEGIN SELECT RAISE(ABORT,'email and phone identity contacts must come from the verified identity provider'); END;
