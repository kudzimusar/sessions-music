# Phase 1 — production identity checkpoint

## Current decision

Use Supabase Auth for public phone OTP, email OTP, Google and Apple identity. Do not build a home-grown token or OTP service inside the Sites starter. D1/R2 remain the product-data source of truth during this phase; Supabase initially owns identity and normalized authorization records only.

The only connected Supabase organization/project is `Wewed`. It is unrelated and must not be changed. The intended project is `Sessions Music` in `eu-central-1` (Frankfurt), under a dedicated organization selected by the owner.

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

## Integration gate

- [ ] Connect the dedicated Supabase organization.
- [ ] Confirm the project cost, then create `Sessions Music` in Frankfurt.
- [ ] Choose and configure an SMS provider supported by Supabase Auth; phone OTP cannot send without it.
- [ ] Configure custom SMTP or a Send Email Auth Hook; Supabase's default email sender is not suitable for public users.
- [ ] Configure Google OAuth client and redirect origins.
- [ ] Configure Apple App ID / Services ID, Team ID and signing key.
- [ ] Configure CAPTCHA/bot protection and provider rate limits.

## Implementation after connection

1. Create a development branch and normalized `profiles`, `organizations`, `organization_memberships`, `verified_contacts`, `device_sessions`, `account_merge_requests` and deletion-audit tables.
2. Keep exposed-table grants explicit, enable RLS, use ownership predicates rather than `TO authenticated` alone, and keep authorization claims out of user-editable metadata.
3. Add SSR/client adapters using the project's publishable key only. The secret/service-role key remains server-only.
4. Replace endpoint identity reads with verified Supabase tokens and central authorization. Keep ChatGPT dispatch identity behind the private demo flag only.
5. Add OTP, OAuth, session/device, revoke-all, deletion and recovery UI.
6. Test real tokens for missing identity, wrong role, cross-tenant access, revoked session and stale membership.
7. Run Supabase security/performance advisors, D1/Worker tests, typecheck, production build and mobile-width QA.

## Current Supabase changes

None. No SQL, project, branch, auth setting or user data has been written to `Wewed`.
