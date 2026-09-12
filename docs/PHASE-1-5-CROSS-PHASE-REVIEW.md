# Sessions Unified Platform v1 — Phase 1–5 Cross-Phase Review

**Review date:** 2026-09-13  
**Scope:** Phase 1 brand foundation through Phase 5 Booking Operations & Cases  
**Status:** Source review / pre-merge release gate. This document does not certify live D1 migrations, Supabase provider configuration, or a deployed ChatGPT Sites version.

## 1. Review objective

This review treats Sessions as one production marketplace with customer, provider and corporate projections over shared canonical records. It explicitly rejects three independently-authored applications, self-selected administrative roles, duplicated booking ledgers, inferred citizenship, shared staff identities, and analytics or operations views that bypass data classification.

The review covers desktop and mobile interaction, authentication and onboarding, staff lifecycle, provider authority, Booking Operations, Cases, privacy boundaries, migration compatibility, auditability and the release/deployment boundary.

## 2. Phase 1 — brand and interaction foundation

### Result

The source uses the approved production primitives Black `#000000`, Royal Blue `#4169E1`, and White `#FFFFFF`, with green/amber/red reserved for semantic state. The global token layer remains the governing palette and later onboarding/operations styles use those same primitives rather than reintroducing the legacy teal/slate product identity.

### Desktop

Corporate and operational workspaces support higher information density, tabular scanning, sticky detail regions and wide filter/tool bars. Focus remains on one page hierarchy rather than dashboard-card proliferation.

### Mobile

New Phase 4.5/5 controls use minimum 44–48 px action heights, single-column fallbacks, card queues instead of horizontally-dependent tables, safe-area-aware floating workspace switching and reduced-motion rules.

### Residual release check

A saved Sites build still needs visual inspection at `/mobile`, `/account`, `/onboarding/provider`, `/corporate`, `/corporate/bookings`, and `/corporate/incidents`; GitHub source review cannot prove the deployed CSS bundle.

## 3. Phase 2 — organization/workforce

### Result

Organizational hierarchy remains non-authoritative. Departments, positions, reporting lines and delegations do not contain role or permission grants. A new additive `corporate_staff_access_state` overlay represents `active`, `suspended`, `departed`, and `terminated` without rewriting the historical workforce migration constraint.

### Lifecycle invariants

- Suspension removes corporate execution authority while preserving the human identity and independently-authorized personal/provider contexts.
- Departure and termination end active reporting relationships.
- Non-active lifecycle changes revoke active/scheduled organizational delegations.
- Non-active lifecycle changes revoke active privileged-administration elevation for the affected identity.
- Terminated staff cannot be reactivated through the lifecycle endpoint; a return requires a newly-reviewed employment record.
- Lifecycle reason and actor are audit facts, not permission grants.

## 4. Phase 3 — IAM, RBAC and privileged administration

### Result

Production corporate roles now fail closed against D1 employment/access state. A valid Supabase corporate role assignment is insufficient if Sessions cannot prove an active `corporate_staff` record with active staff access state. If the workforce check fails, corporate roles/scoped corporate roles are removed from the effective principal before API authorization.

Privileged administration remains a separate AAL2 elevation tied to the exact identity session, with one active privileged elevation per identity and 15-minute expiry.

### MFA

The account-security source now supports TOTP enrollment, QR setup, challenge-and-verify, AAL2 session refresh and factor removal. Sessions does not persist MFA seeds, OTPs, passwords or refresh tokens in D1. Sensitive recovery-identity changes require current AAL2 when a verified factor exists.

### Recovery

Email/phone recovery changes use Supabase verification. Matching contact data never auto-merges two identities and never copies provider/corporate authority. Loss of all factors is explicitly a support-reviewed recovery scenario rather than an automatic recreation of roles.

## 5. Phase 4.5 — identity, onboarding and workspace gateway

### Identity model

One trusted user ID can hold verified email/phone identities and multiple independently-authorized contexts. A Zimbabwe `+263` telephone number is a contact identity and market signal only; it is not proof of citizenship. WhatsApp is a separately consented communication preference and not an authentication/MFA factor.

### Onboarding state

Customer, provider and corporate journeys are distinct state machines over one identity. Required Terms/Privacy decisions are versioned and append-only; marketing and WhatsApp remain optional and separately withdrawable.

### Deep links

Protected-route continuation uses opaque random tokens. D1 stores only a SHA-256 digest and a validated internal return path. Continuations are short-lived, identity-bindable and single-consumption. Protocol-relative/external return paths are rejected by the database constraint and server validation.

### Returning users

The application derives Personal, Studio and Corporate contexts from server authority. The workspace switcher displays only active contexts returned by the server, persists only a context that the onboarding API revalidates, and routes to `/mobile`, `/manage`, or `/corporate` after authorization.

### Provider onboarding

Provider onboarding is now an explicit five-gate journey: identity/agreements → studio application → independent provider verification → organization membership → marketplace readiness. Claim/registration/verification state is read from canonical registry records. Application intent never writes a platform role or organization membership.

## 6. Phase 5 — Booking Operations

### Canonical-data rule

`studio_bookings` remains the booking record. `booking_operation_state` is an operational overlay and intentionally contains no customer identity, quoted price, gross amount, currency or settlement arithmetic. Booking Operations therefore cannot silently become a second booking ledger.

### Mutation controls

Operational state, priority, assignment and SLA mutations require `bookings:manage`, use optimistic revision checks and append immutable `booking_operation_events`. Internal notes append events without rewriting canonical booking content. Customer references are omitted unless the principal separately has customer-reference authority.

### Desktop/mobile

Desktop provides filterable dense queues and a sticky detail/control panel. Mobile replaces the table with touch-size booking cards and moves the detail workflow into a single-column flow.

## 7. Phase 5 — Cases

### Authorization

`cases:read` is necessary but not sufficient. Case visibility and management are category-scoped:

- Customer Support requires Support authority.
- Booking Operations requires Booking Operations authority.
- Provider Operations requires provider oversight.
- Trust & Safety requires claim/verification or restricted-case authority.
- Finance requires settlement-review authority.
- General incidents require incident/operations authority.

Restricted/confidential case data additionally requires `cases:restricted.read`.

### Workflow

Normal transitions are server-controlled. Resolved/closed cases require durable resolution facts. Reopening is an explicit separate action with a reason and returns the case to `in_progress`. Assignment requires `cases:assign`. Notes have explicit visibility and classification. Evidence is an R2 media reference linked from the immutable case event stream; the case table does not copy evidence blobs or private booking-message content.

### Desktop/mobile

Desktop uses a queue/detail layout with timeline, linked records, assignment, SLA and workflow controls. Mobile renders cases as cards with single-column details and 48 px actions. Restricted evidence remains an explicitly labeled section.

## 8. Anonymous surface review

The intended initial production policy is authenticated marketplace access. Page routing sends unauthenticated protected paths through the Sessions welcome/onboarding continuation flow. Legacy registry reads now fail closed when no Sessions identity is supplied. Quote and saved-state endpoints require production identity. Public exceptions are limited to authentication/onboarding support, Terms/Privacy/help, non-secret release/readiness metadata, and signed provider webhooks where applicable.

A 401 status is preferred for direct anonymous API attempts; source paths that fail closed through a lower-level identity invariant must still be checked during the final integration test to ensure they return no marketplace data.

## 9. Privacy and classification review

- D1 onboarding tables contain no password, OTP, refresh-token, MFA-secret or citizenship columns.
- Required/optional consent is separated and append-only.
- Customer references are masked/omitted unless field-level authority permits them.
- Workforce identity fields and lifecycle reasons require elevated organization authority.
- Case classification is evaluated separately from category authorization.
- Restricted case evidence requires restricted-case authority both at upload and at case linkage/read time.
- Private booking-message attachments do not become generally-readable operational evidence.
- Recovery does not infer identity equivalence from a matching email/phone.

## 10. Database and migration review

Phases 4.5/5 are additive migrations:

- `0018_phase45_identity_onboarding.sql`
- `0019_phase5_booking_ops_cases.sql`
- `0020_staff_lifecycle_access.sql`

The lifecycle overlay was selected specifically to avoid rewriting the already-shipped `corporate_staff` status constraint. New audit/event ledgers use no-update/no-delete triggers. Case closure constraints enforce resolution metadata. Operational booking state remains separate from canonical booking/settlement arithmetic.

Before a production Sites release, all unapplied D1 migrations must be applied in order to the intended environment and verified against a backup/restore plan. Source CI proves migration syntax in Node SQLite; it does not prove the hosted D1 database has been migrated.

## 11. Supabase / identity deployment review

Source now models phone, email, Google, Apple, device sessions and TOTP MFA. Public launch still requires the actual Sessions Supabase project to be configured and live-tested for:

- Zimbabwe SMS delivery and abuse controls;
- email magic-link delivery;
- OAuth redirect credentials;
- allowed redirect URLs including `/auth/complete`;
- TOTP MFA;
- individual staff accounts;
- access-token lifetime/session policy;
- production role/membership records and RLS/migration state.

The connected environment available during this implementation does not expose the Sessions Supabase project, so these are deployment certification items rather than source-complete claims.

## 12. Release gate

Phase 4.5/5 source may merge only when the exact PR head completes the repository `npm test` gate successfully after all hardening tests are present. A green earlier commit is not sufficient.

Merge is still not deployment. The saved ChatGPT Sites build must be generated from that reviewed merge commit, inspected, and only then deployed to the existing Sessions Sites project. The deployment must verify release provenance, authentication/onboarding, customer/provider/corporate context switching, Booking Operations, Cases, D1 reads/migrations and R2 authorization.

## 13. Review conclusion

The Phase 1–5 architecture remains one platform with a single canonical marketplace data model. Phase 4.5 adds an identity/onboarding/lifecycle gateway without creating a second account authority; Phase 5 adds operational overlays and cases without creating a second booking system. The remaining certification boundary is environmental: exact-head CI, hosted D1 migration state, live Supabase provider/MFA configuration, and a saved/deployed Sites version from the reviewed commit.
