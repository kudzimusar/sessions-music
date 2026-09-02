# Sessions changelog

## 2 September 2026 — Phase R Workstream 2 implementation

- Added the real concierge settlement state machine without enabling any payment gateway or money custody.
- Confirmed bookings now create a server-priced, integer-cent settlement with an immutable founding-pilot 0% fee snapshot.
- Added private booking-scoped R2 payment proof, studio-only acknowledgement/decline, explicit dispute visibility and Operations-only record resolution.
- Blocked completion without recorded settlement and blocked silent cancellation after a studio-confirmed payment.
- Added monthly studio statements, authenticated PDF/CSV export and immutable prior-month commission invoice records.
- Added D1 revision guards, idempotency events, arithmetic constraints and cross-tenant authorization tests.
- Preserved the private `/demo` route; its simulated gateway remains separate from all real registry settlement screens.
- Verified the checkpoint with a clean standalone typecheck, production build and 98 passing tests.

## 2 September 2026 — Phase R Workstream 1 implementation

- Verified the dedicated `Sessions` Supabase project in Frankfurt, dry-ran the complete identity/RLS migration, then applied it as `20260902085743_phase_r_identity`; all identity tables remain empty and Auth remains disabled.
- Added real Supabase phone OTP, Google OAuth, optional Turnstile, bearer-token verification, device/session management and account deletion requests behind disabled gates.
- Added normalized profiles, platform roles, organizations, memberships, verified contacts, device sessions and private audit records without moving product data out of D1/R2.
- Split ownership from trust: `unclaimed → claimed → pending_verification → verified → bookable`; no claim produces a verified badge.
- Added private R2 verification evidence, owner-supplied room photos (maximum five), and public media only after a saved studio profile references it.
- Added phone- or email-bound studio staff invitations and Supabase organization provisioning for accepted owners/managers/staff.
- Preserved the private `/demo` route and hid every unconfigured production identity/payment/email/AI/ZiG integration.
- Verified the checkpoint with a clean standalone typecheck, production build and 90 passing tests.

## 2 September 2026 — production formalization checkpoint

- Adopted the seven-phase production roadmap with identity as the first launch blocker.
- Added provider-neutral identity and tenant-authorization contracts plus negative security tests.
- Added a complete runtime configuration example without credentials.
- Corrected the calendar health type-safety defect found by the required standalone typecheck.
- Recorded the dedicated Supabase/Auth integration gate; the unrelated `Wewed` project remains untouched.
- Restored the hosted demo to owner-only access with zero external visitors.
- Verified the checkpoint with a production build, 79 passing tests and a clean standalone typecheck.
