# Sessions Unified Platform Implementation v1

Status: APPROVED REFERENCE
Approved direction: 11 September 2026
Extended: 13 September 2026 — Phase 4.5 Identity, Onboarding & Workspace Gateway inserted before Phase 5 and implemented together with Phase 5.
Amended: 13 September 2026 — Product Surface Separation is now binding across Phases 1–5 and all future work.

This file is the repository checkpoint for the approved Sessions unified-platform implementation programme. The full formatted PRD/BRD remains a governing reference supplied in the Sessions project, but where older material conflicts with this file on brand, mobile-vs-web surface architecture, corporate entry, or Phase 1–5 interaction rules, this file and `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md` take precedence.

Implementation work must preserve the following non-negotiable rules.

## Governing rules

1. Sessions remains one production marketplace with customer, provider and Sessions-corporate workspaces projecting the same canonical marketplace objects. Do not create parallel production booking, payment, membership, incident, provider or customer databases for individual surfaces.
2. This is a controlled upgrade of the existing repository, not a greenfield rewrite. Existing production booking integrity, tenant isolation, D1/R2 persistence, Supabase identity boundary, provider price sovereignty and auditability must be preserved.
3. Corporate administration represents Sessions as an operating company: workforce, departments, reporting lines, delegated authority, bookings operations, memberships, incidents/cases, finance, provider operations, customer support, trust & safety, marketing/product analytics, governance and security.
4. Organizational hierarchy and authorization are separate models. Job title/reporting line must never automatically equal system privilege.
5. Every staff member uses an attributable individual identity. Shared administrative accounts are prohibited. Super-admin capability is a privileged security capability, not a corporate title.
6. Authorization is deny-by-default, permission- and scope-based, tenant-aware and auditable. Sensitive fields require explicit policy beyond page-level visibility.
7. Provider organizations have their own scoped administration and staff hierarchy. A provider role never grants marketplace-wide provider access.
8. Analytics uses governed event collection and derived/warehouse-style models rather than uncontrolled reporting queries against transactional booking tables.
9. Search v2 must be availability-aware, equipment-aware, capacity-aware, location-aware and explainable. AI may interpret intent but must never invent price, availability, verification, equipment or provider facts.
10. Customer and provider mobile products are native-mobile-first in information architecture, interaction model and visual composition from Phase 1 onward. Responsive web/PWA views are not accepted as substitutes for the native mobile product.
11. The web/PWA surface remains supported for desktop/web continuity, previews, account access and selected workflows. It may share design tokens, APIs and domain logic with mobile, but must not define mobile composition by shrinking desktop pages.
12. Corporate/administrative surfaces are desktop/tablet-first operational consoles. Corporate mobile support is limited to intentionally selected critical workflows; dense desktop modules must not be converted into generic stacked-card mobile pages.
13. Official production brand colours are Black #000000, Royal Blue #4169E1 and White #FFFFFF. Other colours are semantic status colours only. The previous deep-blue/slate brand palette is legacy and must be migrated from production surfaces.
14. The explicit `/demo` sandbox remains isolated from production data and production authority. It may be used for visual review, including Corporate, only when it is visibly non-production and cannot grant real authority.
15. One human has one Sessions identity. Customer, provider and corporate are contexts/relationships, not separate accounts. Supabase Auth remains authoritative for production authentication identities, factors and sessions; D1 stores application profile/onboarding/consent/lifecycle state and never passwords, OTP secrets, refresh tokens or MFA secrets.
16. Sessions-native onboarding must replace reliance on ChatGPT sign-in as the product identity experience. ChatGPT Sites access remains a hosting/audience gate only.
17. Provider self-selection never grants provider authority; provider access follows claim/registration, verification and organization membership.
18. Corporate access is invitation/assignment driven and has no public self-registration path. Corporate must not be presented as a peer option beside customer/provider onboarding. Corporate entry occurs only from a trusted invitation, authorized staff deep link, explicit internal access route, or an already-authorized workspace context.
19. The product owner/private-UAT reviewer must have a legitimate, auditable way to inspect Corporate. Preferred production-like UAT method: seed/assign the owner identity as authorized staff with bounded review permissions. An isolated `/demo/corporate` surface may supplement visual review but must never replace real authorization testing.
20. WhatsApp is a consented communication channel, not an authentication factor. +263 phone numbers may be normalized for Zimbabwe market use, but phone country code must never be treated as proof of citizenship.
21. Protected deep links must survive authentication/onboarding through bounded, server-validated continuation intents; arbitrary external redirects are forbidden.
22. Suspension/termination is context-aware: customer, provider and corporate contexts can be restricted independently without manufacturing or destroying unrelated authority.

## Product surface separation contract

Sessions has one backend platform but multiple intentionally different interaction surfaces.

### A. Customer mobile application

The customer mobile product must be designed as a native app, not as a responsive website. During web-based prototyping/UAT, the `/mobile` preview must imitate the intended native screen architecture closely enough that it can be migrated to the eventual iOS/Android runtime without redesigning the product.

Required mobile interaction principles:

- edge-to-edge app screens, not centered desktop containers;
- bottom-tab or native app navigation where appropriate;
- navigation stacks such as Search -> Studio -> Room -> Time -> Checkout rather than multi-panel desktop pages;
- full-screen flows for discovery, booking, checkout, account and messaging;
- native-style lists/rows and media hierarchy instead of card-inside-card dashboard composition;
- bottom sheets/drawers for filters, actions and compact selection tasks where appropriate;
- one dominant primary action per screen;
- safe-area-aware fixed/sticky app chrome;
- 44px minimum touch targets, with 48px preferred for primary controls;
- no hover-dependent interaction;
- no desktop sidebars or desktop tables translated mechanically into vertically stacked blocks;
- no assumption that a responsive breakpoint equals a valid mobile design;
- platform-appropriate loading, empty, error and offline states;
- shared backend/domain logic without forced shared page composition.

### B. Provider mobile application

Provider mobile is also native-first and optimized for daily operations: today's sessions, booking requests, check-in, availability, room status, pricing quick actions, notifications and customer communication. It must not be a compressed copy of the provider desktop portal.

### C. Provider desktop/web portal

Provider desktop/web supports dense setup and management such as room configuration, long-range calendar management, staff, reports, payout configuration and analytics.

### D. Corporate desktop/tablet application

Corporate is an internal operating console. Dense queues, tables, filters, master-detail layouts, audit trails and multi-panel workflows are appropriate here. The PWA/web surface is a natural host for this product.

### E. Corporate mobile

Corporate mobile is deliberately bounded. Only high-value critical actions should be implemented, for example urgent incident review, acknowledgement, escalation, quick lookup, approval or case note capture. Do not attempt to mirror the entire desktop control centre on a phone.

## Public onboarding boundary

Public/customer onboarding may present:

- customer/personal account setup;
- provider intent such as "Manage a studio", which begins a verification/application journey and grants no authority by itself.

Public/customer onboarding must not present a "Sessions team member", "Corporate", "Admin", or equivalent self-selection card.

Corporate onboarding begins only after the server can prove one of the following:

- a valid identity-bound staff invitation;
- an active/accepted corporate journey created from a trusted workforce record;
- an already-authorized corporate workspace context.

Corporate onboarding may then require policy acceptance, device registration, MFA/step-up where policy requires it, and activation. The public marketplace must not advertise or expose this internal path as a normal user role choice.

## Implementation sequence

- Phase 0 — baseline, reference lock, migration safety and regression gates.
- Phase 1 — brand/design-system migration plus explicit product-surface separation. Shared tokens are allowed; customer/provider mobile composition must follow the native-mobile contract from this phase onward. Corporate/web may use desktop/PWA patterns.
- Phase 2 — Sessions corporate organization/workforce model: departments, positions, reporting lines, employment records, deputies/delegations. Internal workforce concepts remain absent from public customer/provider onboarding.
- Phase 3 — workforce IAM/RBAC expansion, privileged-session controls, access reviews and field/scope policy. Corporate access remains staff/invitation-bound, and UAT-owner access must be legitimate and auditable rather than implemented as a bypass.
- Phase 4 — corporate control plane: organization, bookings, customers, providers, memberships, incidents, finance, analytics and audit navigation with permission-generated modules. This phase is desktop/tablet-first; only explicitly chosen critical mobile actions are implemented.
- **Phase 4.5 — Sessions-native identity, customer/provider onboarding, consent, lifecycle, workspace/context gateway, recovery, deep-link continuation, device/session posture and mobile/desktop onboarding UX. Corporate onboarding is removed from the public role chooser and is reachable only after trusted invitation/assignment proof.**
- Phase 5 — canonical booking-operations and case/incident workflows, implemented in the same programme increment as Phase 4.5 because Booking Ops/Cases depend on the new identity/lifecycle contract. Booking Ops/Cases remain desktop-dense in Corporate; mobile support is a separately designed critical-action subset, not a responsive collapse of the desktop screen.
- Phase 6 — finance, membership oversight and retention operations.
- Phase 7 — provider-organization administration and provider-scoped RBAC, with provider mobile and provider desktop flows designed independently over shared APIs.
- Phase 8 — Search & Discovery v2, designed first as a native customer-mobile discovery flow and separately for desktop/web.
- Phase 9 — governed product/marketing/operational analytics pipeline and metric layer.
- Phase 10 — native iOS/Android runtime, navigation shell, device integration and migration of the already-native interaction architecture into production mobile clients. Phase 10 does not begin native UX thinking; it operationalizes the native interaction model established from Phase 1.
- Phase 11 — hardening, UAT, production identity/payment/integration certification and release.

## Phase 1–5 corrective requirements

The detailed corrective matrix is binding in `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`. In summary:

- Phase 1: split shared design tokens from surface-specific composition; stop treating responsive breakpoints as the mobile product.
- Phase 2: keep workforce/internal-company concepts inside Corporate only.
- Phase 3: keep staff access invitation-bound and establish an auditable owner-UAT access pattern.
- Phase 4: preserve desktop-dense Corporate; do not force complete Corporate parity onto mobile.
- Phase 4.5: public onboarding becomes Customer + Provider intent only; Corporate onboarding is invitation/deep-link/internal-access only.
- Phase 5: Booking Operations/Cases desktop remains dense; mobile is a separately designed critical-action subset.

## Phase 4.5 requirements summary

The full identity/lifecycle contract remains in `docs/PHASE-4-5-AND-5-IMPLEMENTATION.md`, subject to the surface-separation amendment. At minimum Phase 4.5 must provide:

- Sessions-native sign-in/create-account entry for phone/email/social providers when configured;
- one identity with Personal, Provider and Corporate contexts derived from trusted relationships;
- verified email/phone identity linkage and authentication session/AAL visibility;
- explicit WhatsApp communication preference tied to consent, not authority;
- customer and provider onboarding in the public product;
- corporate onboarding only after trusted invitation/assignment proof;
- versioned legal/communication consent ledger;
- safe deep-link continuation across authentication/onboarding;
- returning-user context selection and last-valid-context behavior;
- context-aware suspension, departure, deletion-pending and termination handling;
- recovery that restores identity but never recreates organization authority;
- device/session management and MFA/AAL2 preservation;
- fully gated initial launch policy with only landing/legal/privacy/help/auth public;
- native-app-style phone UX for customer/provider previews and focused desktop UX for web;
- privacy-by-design/data-minimization and no secret/token persistence in D1/R2.

## Phase 5 requirements summary

The full contract remains in `docs/PHASE-4-5-AND-5-IMPLEMENTATION.md`, subject to the surface-separation amendment. At minimum Phase 5 must provide:

- server-controlled canonical booking state machine and append-only booking timeline;
- customer/provider/support/trust/finance/operations booking projections over the same booking object;
- Booking Operations queue, filters, assignment/SLA/risk signals and controlled interventions;
- canonical case object linked to booking/customer/provider/settlement without duplicating them;
- case categories, priority/severity, controlled state machine, assignment, notes/evidence policy, SLA/escalation and resolution/closure;
- case-scoped authority that never becomes global access;
- consent-aware customer/provider communication metadata;
- desktop-dense corporate operational UI;
- separately designed mobile critical-action UI rather than desktop-to-mobile stacking;
- negative tenant/field/permission tests and append-only audit history.

## Definition of implementation discipline

Every phase must:

- start from the current green mainline behavior;
- read this file, `AGENTS.md`, and the surface-separation amendment before making UI/product-architecture changes;
- state which surface is being changed: customer-native, provider-native, provider-web, corporate-desktop, corporate-critical-mobile, or shared backend;
- reject generic "responsive" acceptance criteria when the work targets customer/provider native mobile;
- introduce additive migrations before destructive cleanup;
- preserve old URLs through explicit redirects where applicable;
- add negative authorization tests, not only happy-path tests;
- keep all money server-priced and integer-based;
- keep historical booking/settlement snapshots immutable;
- prove tenant and field isolation;
- keep browser/local storage non-authoritative;
- preserve public/corporate onboarding separation;
- pass the full production build and test suite before the phase is considered complete;
- document any deployment gate that source code alone cannot prove.

For Phase 4.5 + Phase 5 specifically, completion additionally requires a private UAT Site version built from the exact reviewed Git commit, with the Sessions-native gateway, returning-user behavior, Booking Ops and Cases exercised against the deployed application before Phase 6 begins. UAT must separately review native-mobile interaction quality and desktop/corporate quality; one cannot certify the other.
