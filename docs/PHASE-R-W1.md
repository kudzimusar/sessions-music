# Phase R — Workstream 1 release evidence

Status: code and base identity schema complete; live provider integration blocked on credentials. D1/R2 remain the system of record. `/demo` is preserved and remains private.

## Delivered

- Supabase phone OTP first and Google OAuth second, both hidden behind runtime gates.
- Optional Cloudflare Turnstile token support and a local 60-second resend cooldown.
- Server authentication against `/auth/v1/user` plus the RLS `current_identity` RPC; expired, revoked, mismatched or malformed identities fail closed.
- App-level device registry, local/other/global sign-out, device revocation and deletion-request capture.
- Server roles and active studio organization membership checks on the real registry, planner, billing and calendar endpoints.
- Claim, registration, independent ownership review, separate studio verification, room/rate/capacity/hours editor, full address/pin, five room photos and explicit go-live control.
- Private verification evidence in R2. Only the owner and Operations can read it. Room images become public only after the saved D1 room references them.
- Staff invitations bound to an exact verified phone or email; acceptance provisions the matching Supabase organization membership.

## State and trust contract

| State | Meaning | Public trust/booking effect |
| --- | --- | --- |
| `unclaimed` | Source-backed registry lead | No owner, badge, rates or booking |
| `claimed` | Ownership authority approved | Private workspace only |
| `pending_verification` | Business/operating evidence submitted | No verified badge or booking |
| `verified` | Separate Operations review approved | Verified badge, booking still off |
| `bookable` | Verified owner completed rooms, pin and terms and enabled requests | Booking requests allowed |

## Migrations

- Supabase: checked-in identity migrations `202609020001_phase_r_identity.sql` through `202609140002_phase1_5_scoped_role_performance_hardening.sql` are applied to Sessions Music; tables remain empty.
- Supabase: `supabase/migrations/202609020002_phase_r_identity_hardening.sql` enables private-audit RLS and administrative foreign-key indexes; it is applied and verified.
- D1: `drizzle/0007_sticky_forge.sql` adds studio verification requests.
- D1: `drizzle/0008_wise_war_machine.sql` adds studio media ownership/purpose metadata and an index.

All migrations are additive. Existing migration files were not rewritten.

## Required integration help before public sign-in

1. Supabase-supported SMS provider credentials and approved sender setup for Zimbabwe delivery.
2. Google OAuth client ID/secret and the exact production/callback origins.
3. Turnstile site/secret keys, or an explicit decision to use another Supabase CAPTCHA provider.
4. Supabase publishable and secret keys added to the Sites runtime (not source control).
5. A second Operations reviewer account so no claimant can review their own evidence.

Do not enable `SUPABASE_AUTH_ENABLED`, phone or Google flags until each corresponding live test passes.

## Mobile QA checklist

- [ ] 360 × 800 Android: phone keyboard, +263 normalization, CAPTCHA, OTP entry, resend countdown and error recovery.
- [ ] 390 × 844 iPhone: safe areas, focus/keyboard visibility, OAuth return and account device actions.
- [ ] Owner phone: claim → evidence photo → verification status → room photo/rate/capacity/hours → confirmed pin → go live.
- [ ] Staff phone: receive shared acceptance link, sign in using the invited number, accept, choose private/public profile.
- [ ] Operations phone: ownership and verification queues, private evidence open, self-review blocked.
- [ ] `/demo`: remains owner-only and all simulated labels/routes still work.

Physical-device items remain unchecked until credentials are available and a live provider test can be run honestly.

Automated gate: standalone TypeScript check clean, production build green, 90/90 tests passing.
