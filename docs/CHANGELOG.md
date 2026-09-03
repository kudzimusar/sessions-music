# Sessions changelog

## 3 September 2026 — Phase R Workstream 4 implementation

- Added server-issued, revocable booking vouchers with QR, share/copy and minimal calendar artifacts for confirmed real registry bookings.
- Added private booking inboxes, booking-authorized R2 image attachments, read state, in-app updates and audited user-triggered WhatsApp deep links. Sessions does not auto-send WhatsApp messages.
- Added minimal device-only offline booking references, explicitly marked as non-authoritative and cleared at sign-out.
- Added consented, feature-gated email reminder contracts plus an idempotent 24-hour / 2-hour Worker reminder handler. No email relay or schedule trigger is enabled in production.
- Added D1 communication and notification migration plus security, stale/idempotency, tenant-boundary, cancellation/revocation and reminder tests. Certified with 112 passing tests, a clean standalone typecheck and production build; privately deployed without enabling email, a reminder scheduler or public visitor access. `/demo` remains unchanged.

## 3 September 2026 — Phase R Workstream 3b implementation

- Added server-authoritative weekly booking series from two to twelve sessions, with all-or-nothing D1 inventory commits and idempotent retries.
- Added a membership ledger for owner-recorded off-platform fees and completed-session attendance, keeping membership money outside Sessions custody.
- Added a default-off Operations loyalty-credit policy, studio-specific earned balances, atomic redemption reservations and cancellation/decline reversals.
- Added phone-first weekly cadence and earned-credit controls plus a studio membership activity ledger.
- Certified with 106 passing tests, a clean standalone typecheck and production build; privately deployed without enabling a payment gateway or public visitor access.

## 3 September 2026 — Phase R Workstream 3 implementation

- Replaced the hard-coded commercial assumption with effective-dated, server-controlled fee policies for musician-paid, studio-paid and split fees.
- Added room-level policy overrides, commissionable add-on catalogues, deposits, itemized quote UI and immutable policy snapshots stored with each booking.
- Preserved the 0% founding-studio pilot fallback and the W2 concierge settlement model; no payment gateway or money custody was activated.
- Added Operations policy controls, add-on/deposit management for studio owners, and negative tests for identity, role, hostile origin, idempotency, overlap and unavailable/duplicate add-ons.
- Certified with 102 passing tests, a clean standalone typecheck and production build; privately deployed without changing `/demo` or Supabase product data.

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
