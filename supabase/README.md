# Sessions Supabase migration handoff

Status: blocked until the user-selected Supabase organization is connected. Do not reuse the linked `Wewed` project.

## Target

- Project: `Sessions Music`
- Region: `eu-central-1` (Frankfurt)
- Initial role: staged Postgres/Auth/Realtime foundation for mobile clients
- Current production source of truth: Cloudflare D1 and R2

## Safe migration sequence

1. Create the isolated project only after Supabase reports its organization-specific cost and the user confirms it.
2. Model accounts, studios, staff memberships, rooms, bookings, loyalty memberships, calendar sync records and audit events with explicit primary/foreign keys.
3. Put internal tables and security-definer helpers in non-exposed schemas. Grant only the operations each API role needs.
4. Enable and test RLS on every exposed table. Use `(select auth.uid())`, index every owner/member/foreign-key column referenced by policies, and keep the service role server-only.
5. Run migrations in a development branch, generate TypeScript types, then run Supabase security and performance advisors.
6. Import immutable IDs and source metadata first. Reconcile counts and hashes before enabling dual writes.
7. Dual-write D1 and Supabase with idempotency keys and an audit trail. Keep reads on D1 until mismatch monitoring is clean.
8. Move mobile reads to Supabase behind a feature flag. Retain a rollback window before any D1 retirement decision.

No SQL migration is included yet because it cannot be tested against the intended project or its auth configuration. Once the organization is connected, create and verify the schema through the Supabase migration workflow rather than applying unreviewed SQL to another project.
