# Phase 1 — production identity checkpoint

## Current decision

Use Supabase Auth for public phone OTP first and Google OAuth second. Do not build a home-grown token or OTP service inside the Sites starter. D1/R2 remain the product-data source of truth; Supabase owns identity and normalized tenant authorization only.

The authoritative project is `Sessions Music` (`ennfiyxlkvlmtkmibltz`) in `ap-northeast-1` (Tokyo), URL `https://ennfiyxlkvlmtkmibltz.supabase.co`. On 14 September 2026 it was verified `ACTIVE_HEALTHY`, initially empty, and selected as the Sessions identity authority. `church-os-dev` (`svhxjfearcuqxikzvlyb`) is unrelated and forbidden.

## Completed groundwork

- [x] Production roadmap and ordered gates recorded.
- [x] Baseline production build and 73 existing tests pass; the checkpoint now passes 79 tests including six identity proofs.
- [x] Standalone typecheck defect identified and corrected.
- [x] E.164 Zimbabwe phone normalization and strict six-digit OTP input contract added.
- [x] Central identity principal, active-session gate, platform roles and organization membership authorization added.
- [x] Negative unit proofs cover expiration, revocation, role escalation and cross-tenant access.
- [x] Identity provider contract added without creating a fake provider.
- [x] Runtime configuration inventory added without secrets.
- [x] Sites access restored to owner-only custom access with zero external visitors.
- [x] Dedicated Sessions Supabase project verified without touching another organization.
- [x] Additive identity/RLS migration written and executed inside a rollback-only live transaction.
- [x] Production bearer-token adapter validates the Supabase Auth user, RLS identity context, token expiry, app-level device revocation, roles and active organization memberships.
- [x] Real phone OTP, optional Turnstile, Google OAuth, device/session controls and deletion-request UI implemented behind disabled runtime gates.
- [x] Claim approval separated from studio verification; only `bookable` studios can receive requests.
- [x] Phone- or email-bound staff invitations, private verification images and up to five R2 room photos implemented with tenant checks.

## Integration gate

- [x] Connect and verify the dedicated Supabase organization/project.
- [x] Confirm Sessions Music is the active Tokyo project selected as the Sessions identity authority.
- [x] Apply and verify the chronological identity/authority migration sequence through `202609140002_phase1_5_scoped_role_performance_hardening.sql` on Sessions Music.
- [ ] Add the project publishable and secret keys to the Sites runtime; never commit them.
- [ ] Choose and configure an SMS provider supported by Supabase Auth; phone OTP cannot send without it.
- [ ] Configure Google OAuth client and redirect origins.
- [ ] Configure CAPTCHA/bot protection and provider rate limits.
- [ ] Create a second Operations reviewer account before any studio can be verified.

## Implementation after connection

1. Review and approve the advisor follow-up `supabase/migrations/202609020002_phase_r_identity_hardening.sql`; it enables RLS with no client policy on the private audit table and adds five foreign-key indexes.
2. Re-run Supabase security and performance advisors after that follow-up.
3. Configure SMS, Google OAuth, CAPTCHA and exact production redirect origins.
4. Add Sites runtime secrets and keep `SUPABASE_AUTH_ENABLED=false` until real OTP/OAuth tests pass.
5. Test real tokens for missing identity, wrong role, cross-tenant access, revoked session and stale membership.
6. Run the full D1/R2 tests, typecheck, production build and physical-phone QA.
7. Switch `SESSIONS_IDENTITY_MODE=supabase`, then enable only the provider that passed its live test. Keep `/demo` owner-only.

## Current Supabase changes

The chronological checked-in Sessions identity migrations through `202609140002_phase1_5_scoped_role_performance_hardening.sql` are applied to `ennfiyxlkvlmtkmibltz`. The public identity tables and private audit table have RLS and contain zero rows. Grant and performance findings are cleared; the private-audit no-policy and intentional device-RPC SECURITY DEFINER notices remain by design. Auth provider flags remain disabled until delivery configuration and live OTP/OAuth tests are complete. No Sessions SQL or data was sent to `church-os-dev`.
