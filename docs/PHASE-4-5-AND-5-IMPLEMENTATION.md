# Sessions Phase 4.5 + Phase 5 Implementation Contract

Status: IMPLEMENTATION REFERENCE
Date: 13 September 2026

This document extends the approved Sessions Unified Platform Implementation v1. It is binding on the implementation that follows Phase 4 and precedes Phase 6.

## Why Phase 4.5 exists

Sessions already has strong authorization after a trusted identity reaches the application, but the product entry, onboarding, lifecycle and context-selection journey must become a first-class Sessions capability rather than relying on ChatGPT Sites sign-in as the product identity experience.

Phase 4.5 therefore introduces Sessions-native identity onboarding on top of the existing Supabase authority boundary and D1 marketplace. Phase 5 then builds canonical Booking Operations and Cases on the same identity, booking, provider, payment and audit objects.

The two phases are implemented together because booking operations, cases, notifications, deep links, suspensions, account recovery and staff/provider/customer projections all depend on a coherent identity lifecycle.

## Non-negotiable identity model

1. One human has one Sessions identity. Customer, provider and corporate are contexts/relationships, not separate accounts.
2. Supabase Auth remains the authentication authority for production identities, authentication factors and access sessions. D1 must never store passwords, OTP secrets, refresh tokens or MFA secrets.
3. A Sessions user is keyed by the trusted Supabase `user_id`.
4. Verified email and verified phone identities are read from the trusted identity provider and may be mirrored only as application contact metadata where necessary for product communication or audit.
5. Zimbabwe mobile numbers are normalized to E.164 `+263…` when supplied. A +263 number does not prove citizenship. Sessions must not infer citizenship from phone country code.
6. WhatsApp is a contact channel preference tied to a verified phone where possible. WhatsApp availability/consent is not itself an authentication factor.
7. Corporate access is invitation/assignment driven. There is no public “create admin account” path.
8. Provider access is claim/registration + verification + organization-membership driven. Choosing “provider” during onboarding never grants provider authority.
9. A customer identity exists by default after successful Sessions onboarding. Elevated contexts are additive.
10. MFA/AAL2 is required for privileged corporate elevation and may be required for sensitive provider/customer actions through step-up policy.
11. Authentication session state and device/session management remain attributable to one identity. Shared staff/admin accounts are prohibited.
12. ChatGPT Sites access is a hosting/audience gate only. It must not be treated as the Sessions identity authority.

## Public and authenticated boundary

Initial launch policy is fully gated:

- Public: landing, legal, privacy, help/status and authentication entry.
- Authenticated: studio discovery, studio details, booking, messaging, memberships, provider workflows and corporate workspaces.
- Public discovery may be enabled later by policy without changing the identity model.

The application must not expose customer/provider/corporate data merely because the hosting layer allowed the HTTP request.

## Phase 4.5 requirements — Identity, onboarding and workspace gateway

### IDO-001 — Sessions-native authentication entry

The application must provide a dedicated Sessions sign-in/create-account experience for desktop, PWA and mobile. It must not present ChatGPT sign-in as the Sessions product identity.

Supported production identity methods are designed for:

- verified Zimbabwe phone OTP;
- verified email OTP/magic-link;
- Google;
- Apple when configured;
- MFA enrollment/step-up through Supabase Auth.

Preview/host identity may exist only as an explicit non-production fallback and must never create production authority.

### IDO-002 — One identity, multiple contexts

After authentication the system derives available contexts from trusted relationships:

- Personal / Customer;
- one or more Provider organizations;
- Sessions Corporate where an active staff assignment exists.

A returning user with one context enters it directly. A returning user with multiple contexts receives a workspace chooser. The chooser never grants authority; it only selects among contexts already authorized by the server.

### IDO-003 — Customer onboarding state machine

Customer state:

- `identity_verified`
- `profile_required`
- `consent_required`
- `active`
- `restricted`
- `suspended`
- `deletion_pending`
- `terminated`

Customer onboarding should normally require only verified contact, display name, market/locale, required legal consent and optional service preferences. Marketing consent is optional and separate.

### IDO-004 — Provider onboarding state machine

Provider application state:

- `none`
- `draft`
- `submitted`
- `under_review`
- `changes_requested`
- `approved`
- `rejected`
- `suspended`
- `terminated`

Journey:

1. authenticate/create Sessions identity;
2. choose “Manage a studio” intention;
3. search canonical sourced registry;
4. claim existing studio or register a new studio;
5. record relationship (owner/director/manager/authorized representative);
6. collect only necessary business/contact data;
7. upload restricted verification evidence where required;
8. accept versioned Provider Terms and disclosures;
9. submit for review;
10. remain usable as a customer while pending;
11. after approval create/activate provider organization membership;
12. complete rooms, pricing, hours, availability, policies, payout setup and team invitation before bookability.

A claim never automatically means verified or bookable.

### IDO-005 — Corporate onboarding state machine

Corporate state:

- `none`
- `invited`
- `accepted`
- `security_setup_required`
- `active`
- `suspended`
- `departed`
- `terminated`

Corporate onboarding is invitation-only and identity-bound. It verifies that the authenticated identity matches the trusted invitation/staff record, records policy acceptance, requires security setup, and then exposes only authorized corporate modules.

### IDO-006 — Privileged onboarding

Super-admin capability follows:

`active corporate identity -> super_admin_eligible -> AAL2 -> recorded purpose -> short-lived privileged session -> audited mutation`

Legacy permanent `super_admin` remains migration-only and cannot be newly granted from the product UI/API.

### IDO-007 — Trusted contact model

Each Sessions identity must be able to represent:

- trusted `user_id`;
- verified email identity where present;
- verified phone identity where present;
- WhatsApp contact preference/number, with explicit opt-in and verification relationship;
- authentication method;
- active authentication session ID;
- AAL (`aal1`/`aal2`);
- device/session metadata through the trusted identity layer;
- locale/market, without inferring citizenship;
- communication consents by channel and purpose.

### IDO-008 — Consent ledger

Required legal and optional communication consent must be append-only/versioned records containing:

- user ID;
- document/consent type;
- document version;
- granted/declined status;
- timestamp;
- channel/source;
- withdrawal timestamp where applicable.

A boolean `accepted=true` without version provenance is insufficient.

### IDO-009 — Deep-link continuation

Protected deep links must survive authentication/onboarding. Examples:

- studio team invitation;
- provider claim/review request;
- booking/session link;
- case/support link;
- corporate invitation;
- account recovery/security link.

The server stores/validates a bounded continuation intent. The client must not accept arbitrary external redirect URLs. Expired, consumed or identity-mismatched deep links fail closed.

### IDO-010 — Returning-user behavior

Returning users must resume unfinished onboarding where appropriate, otherwise enter their last valid context if still authorized. If that context has been suspended/terminated, the gateway recalculates available contexts and never silently restores stale authority.

### IDO-011 — Suspension and termination

Lifecycle controls are context-aware:

- customer suspension restricts customer application capability according to reason/policy;
- provider suspension removes provider workspace authority without necessarily deleting the personal customer identity;
- corporate suspension/departure removes corporate authority while leaving legitimate personal/provider contexts intact;
- termination/deletion never destroys immutable booking/financial/audit records that must be retained by policy;
- every transition records actor, reason code, timestamp and audit event.

### IDO-012 — Account recovery

Recovery restores the identity, not organization authority. Recovering email/phone/MFA access must never manufacture provider ownership, corporate roles or privileged eligibility.

### IDO-013 — Device/session management

Users can inspect and revoke Sessions device sessions. Corporate and sensitive provider actions may require step-up. Revocation is enforced by the trusted session checks already used by Sessions APIs.

### IDO-014 — Mobile onboarding UX

Phone-first rules:

- one primary question per screen;
- minimum 44px targets and safe-area handling;
- OTP autofill and correct keyboard/input modes;
- +263 normalization and clear phone formatting;
- save/resume for provider onboarding;
- deep-link continuation after auth;
- clear back/continue controls;
- progress indication for multi-step provider/corporate journeys;
- no duplicate entry of trusted identity data;
- customer activation target under one minute when providers are available.

### IDO-015 — Desktop onboarding UX

Desktop uses the same state machine with a wider two-panel presentation: contextual explanation/security/privacy on one side and focused action on the other. Desktop must not expose more fields merely because space exists. Provider onboarding can use a stepper/sidebar; corporate onboarding can show invitation/security posture.

### IDO-016 — Privacy and data minimization

- collect only purpose-bound data;
- request location just-in-time;
- separate marketing consent from required legal acceptance;
- never infer citizenship from phone/locale;
- classify provider verification evidence as restricted;
- classify corporate employment/security data separately from customer profile data;
- do not log OTPs, tokens, MFA secrets, full sensitive evidence or arbitrary redirect payloads;
- apply `private, no-store` to identity/onboarding endpoints.

### IDO-017 — WhatsApp

WhatsApp is initially a communication preference/channel, not an authentication factor. The product records whether the user explicitly opted in to WhatsApp communication and which verified phone it is associated with. Future WhatsApp Business integration must honor purpose/channel consent and opt-out.

### IDO-018 — Landing behavior

Unauthenticated application routes redirect to the Sessions gateway while preserving a safe continuation intent. Landing contains product identity, sign in/create account, legal/privacy/help, and a secondary “Sessions team member?” path. Corporate/admin is never advertised as self-registration.

### IDO-019 — No duplicate identity authority

D1 stores Sessions profile, onboarding, consent, lifecycle and continuation state. Supabase remains authoritative for authentication identities, factors and sessions. D1 must not become a password/MFA/session-token store.

### IDO-020 — Auditability

Identity/onboarding lifecycle changes emit attributable audit records without storing secrets. Security-sensitive mutations include actor, target, event, timestamp, reason/purpose and relevant context.

## Phase 5 requirements — Canonical Booking Operations + Cases

Phase 5 does not create a corporate copy of bookings. It adds operational workflow around the canonical `studio_bookings` object and introduces a canonical case domain linked to bookings/customers/providers/settlements where needed.

### BOOK-001 — Canonical booking state machine

Every booking exposes an explicit operational state and timeline. Allowed transitions are server-controlled and actor/permission aware. Existing booking snapshots, price snapshots and slot-integrity rules remain authoritative.

### BOOK-002 — Booking projections

The same booking has scoped projections for:

- customer;
- provider organization;
- support;
- trust & safety;
- finance;
- booking operations;
- analytics.

Projection policy must minimize fields by role and relationship.

### BOOK-003 — Booking Operations queue

Corporate Booking Operations receives queue/filter/search over canonical bookings with status, dates, studio, customer reference only where permitted, payment posture, linked case count, SLA/risk flags and assignment where applicable.

### BOOK-004 — Booking timeline

A booking timeline records attributable operational events such as request, confirmation, cancellation, reschedule, payment/proof events, provider/customer communication events, operational intervention and linked-case activity. Timeline events are append-only.

### BOOK-005 — Controlled interventions

Operations actions such as cancellation/reschedule assistance, exception recording or state correction must require permission, reason code and audit event. Money-affecting actions remain delegated to the existing finance/payment authority and cannot be silently rewritten by Booking Operations.

### BOOK-006 — Provider/customer boundaries

Provider users can act only within authorized provider organizations. Customers can act only on their bookings. Corporate roles receive explicit projections/commands; there is no “admin can do everything” fallback.

### BOOK-007 — Booking search and identifiers

Operations can resolve a booking by canonical ID and bounded operational search fields. Search must not expose unrelated customer data. Human-facing references may be introduced without replacing immutable canonical IDs.

### BOOK-008 — Booking SLA signals

Bookings may produce operational SLA/risk signals, but Phase 5 does not fabricate analytics metrics. Signals are derived from authoritative booking/case timestamps and state.

### CASE-001 — Canonical case object

Introduce a case object with:

- case ID and human reference;
- category/type;
- severity/priority;
- status;
- reporter/source;
- assignee/team;
- linked booking/customer/provider/settlement identifiers as applicable;
- created/updated/resolved timestamps;
- SLA target/next-action timestamp;
- restricted summary and classification metadata.

### CASE-002 — Case categories

Initial categories support customer support, booking operations, provider operations, trust & safety, payment/finance coordination and general operational incidents. Category controls ownership and visibility.

### CASE-003 — Case state machine

Suggested lifecycle:

`open -> triaged -> in_progress -> waiting_customer|waiting_provider|waiting_internal -> resolved -> closed`

with controlled reopen. Invalid transitions are rejected by the server/database contract.

### CASE-004 — Assignment

Cases can be assigned to an authorized staff identity/team. Assignment never grants underlying booking/customer/provider authority outside the case scope. Case-scoped roles remain bounded to the case.

### CASE-005 — Case notes and evidence

Notes/events are append-only with author, timestamp, visibility/classification and optional restricted evidence reference. Private customer-provider messages are not automatically copied into cases.

### CASE-006 — SLA and escalation

Cases support policy-derived first-response/next-action/resolution targets, breach state and escalation events. SLA policy changes do not rewrite historical timestamps.

### CASE-007 — Customer/provider communication

Phase 5 may record outbound/inbound operational communication metadata and approved message templates, but channel delivery remains consent-aware. WhatsApp/email/SMS communication must respect onboarding/contact preferences.

### CASE-008 — Cross-domain linking

A case may link to booking, studio/provider organization, customer reference and settlement without duplicating those records. Access to linked objects is separately authorized.

### CASE-009 — Audit and closure

Every state, assignment, severity, link, note visibility and resolution mutation is attributable and auditable. Closure requires a resolution code/summary where policy requires it.

## Desktop Booking Ops / Case UX

Corporate desktop provides dense operational tools:

- persistent permission-generated corporate navigation;
- queue/table with saved filters and bounded search;
- booking/case split detail view where practical;
- timeline, assignment, SLA and linked-object panels;
- command bar/actions gated by permission and state;
- visible classification and data-minimization indicators;
- no hidden horizontal overflow for critical commands;
- keyboard/focus support.

## Mobile Booking Ops / Case UX

Critical mobile workflows must support:

- queue cards instead of unusable wide tables;
- tap-through booking/case summary;
- assignment/status/next-action updates where authorized;
- call/message handoff only through permitted channels;
- sticky safe-area action bar without obscuring content;
- no bulk destructive operations on small screens;
- restricted evidence only after explicit navigation/authorization;
- fast incident escalation and case-note capture.

## Database consistency rules

1. Supabase: authentication identities/factors/sessions, trusted platform/scoped authority and provider/corporate identity relationships where already defined.
2. D1: Sessions profile/onboarding/consent/lifecycle/deep-link state; canonical marketplace bookings; canonical cases and operational events.
3. R2: restricted evidence/media with D1 authorization metadata.
4. No passwords, OTP codes, refresh tokens or MFA secrets in D1/R2 logs.
5. No duplicate corporate booking/customer/provider tables.
6. New migrations are additive and reversible by forward correction; destructive cleanup waits for later hardening.
7. New state transitions are protected by CHECK/trigger/application invariants and negative tests.

## Release gate for combined Phase 4.5 + Phase 5

The phase is not complete until:

- Sessions-native gateway/onboarding is rendered on mobile and desktop;
- unauthenticated protected routes are gated with safe continuation;
- customer/provider/corporate journeys are stateful and permission-correct;
- consent/deep-link/lifecycle tables and APIs are tested;
- suspended/departed/terminated contexts fail closed;
- returning multi-context users receive a server-derived chooser;
- MFA/AAL2 requirements remain intact;
- canonical Booking Operations queue/detail/timeline/actions exist;
- canonical Cases queue/detail/state/assignment/SLA/events exist;
- customer/provider/corporate projections pass negative authorization tests;
- mobile safe-area/scroll/action behavior is verified;
- full production build and test suite is green;
- D1/Supabase migrations are packaged and deployment caveats are documented;
- a private UAT Site version is built from the exact reviewed Git commit before Phase 6 begins.
