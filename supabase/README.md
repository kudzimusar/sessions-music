# Sessions Supabase identity handoff

Target: dedicated project `Sessions` (`meswozsllmmiqjwljvnb`), organization `ybquartnpsqiyfbqgkgg`, `eu-central-1` (Frankfurt). D1 and R2 remain the product system of record. Supabase owns Auth and normalized identity/tenant authorization only.

`migrations/202609020001_phase_r_identity.sql` adds profiles, server-granted platform roles, studio organizations/memberships, verified contacts, app-level device sessions, merge/deletion requests and a private identity audit. Every exposed table has RLS plus explicit grants. Roles are not read from user-editable metadata.

The migration passed a rollback-only transaction and was then applied as `20260902085743_phase_r_identity` on 2 September 2026. The identity tables remain empty and Auth providers remain disabled. The advisor follow-up in `202609020002_phase_r_identity_hardening.sql` is intentionally not applied until the owner approves RLS-with-no-client-policies for the private audit table.

## Apply sequence

1. Confirm every operation targets `meswozsllmmiqjwljvnb`; never select or access Wewed.
2. Review and approve the hardening migration, then apply it and re-run both advisors.
4. Configure an SMS provider, Google OAuth, CAPTCHA and exact redirect origins.
5. Put `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and the server-only `SUPABASE_SECRET_KEY` in secure Sites runtime configuration.
6. Keep all auth provider flags off while testing. Exercise real OTP/OAuth, revocation and cross-tenant rejection.
7. Switch `SESSIONS_IDENTITY_MODE=supabase`, enable only the tested provider, and keep `/demo` owner-only.

Never expose the secret key to browser code or move rooms, bookings, pricing, settlement or media ownership into Supabase during Workstream 1.
