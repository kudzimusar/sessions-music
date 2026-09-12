# Sessions Unified Platform Implementation v1

Status: APPROVED REFERENCE
Approved direction: 11 September 2026
Extended: 13 September 2026 — Phase 4.5 Identity, Onboarding & Workspace Gateway inserted before Phase 5 and implemented together with Phase 5.

This file is the repository checkpoint for the approved Sessions unified-platform implementation programme. The full formatted PRD/BRD remains the governing reference supplied in the Sessions project. Implementation work must preserve the following non-negotiable rules.

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
10. Customer/provider product direction is native-mobile-first. Corporate/administrative surfaces must support both dense desktop/tablet workflows and critical mobile workflows.
11. Official production brand colours are Black #000000, Royal Blue #4169E1 and White #FFFFFF. Other colours are semantic status colours only. The previous deep-blue/slate brand palette is legacy and must be migrated from production surfaces.
12. The explicit /demo sandbox remains isolated from production data and production authority.
13. One human has one Sessions identity. Customer, provider and corporate are contexts/relationships, not separate accounts. Supabase Auth remains authoritative for production authentication identities, factors and sessions; D1 stores application profile/onboarding/consent/lifecycle state and never passwords, OTP secrets, refresh tokens or MFA secrets.
14. Sessions-native onboarding must replace reliance on ChatGPT sign-in as the product identity experience. ChatGPT Sites access remains a hosting/audience gate only.
15. Provider self-selection never grants provider authority; provider access follows claim/registration, verification and organization membership. Corporate access is invitation/assignment driven and has no public self-registration path.
16. WhatsApp is a consented communication channel, not an authentication factor. +263 phone numbers may be normalized for Zimbabwe market use, but phone country code must never be treated as proof of citizenship.
17. Protected deep links must survive authentication/onboarding through bounded, server-validated continuation intents; arbitrary external redirects are forbidden.
18. Suspension/termination is context-aware: customer, provider and corporate contexts can be restricted independently without manufacturing or destroying unrelated authority.

## Implementation sequence

- Phase 0 — baseline, reference lock, migration safety and regression gates.
- Phase 1 — design-system and navigation migration to Black/Royal Blue/White with responsive/native-compatible tokens.
- Phase 2 — Sessions corporate organization/workforce model: departments, positions, reporting lines, employment records, deputies/delegations.
- Phase 3 — workforce IAM/RBAC expansion, privileged-session controls, access reviews and field/scope policy.
- Phase 4 — corporate control plane: organization, bookings, customers, providers, memberships, incidents, finance, analytics and audit navigation with permission-generated modules.
- **Phase 4.5 — Sessions-native identity, onboarding, consent, lifecycle, workspace/context gateway, recovery, deep-link continuation, device/session posture and mobile/desktop onboarding UX.**
- Phase 5 — canonical booking-operations and case/incident workflows, implemented in the same programme increment as Phase 4.5 because Booking Ops/Cases depend on the new identity/lifecycle contract.
- Phase 6 — finance, membership oversight and retention operations.
- Phase 7 — provider-organization administration and provider-scoped RBAC.
- Phase 8 — Search & Discovery v2.
- Phase 9 — governed product/marketing/operational analytics pipeline and metric layer.
- Phase 10 — native mobile application architecture and customer/provider migration.
- Phase 11 — hardening, UAT, production identity/payment/integration certification and release.

## Phase 4.5 requirements summary

The full contract is in `docs/PHASE-4-5-AND-5-IMPLEMENTATION.md`. At minimum Phase 4.5 must provide:

- Sessions-native sign-in/create-account entry for phone/email/social providers when configured;
- one identity with Personal, Provider and Corporate contexts derived from trusted relationships;
- verified email/phone identity linkage and authentication session/AAL visibility;
- explicit WhatsApp communication preference tied to consent, not authority;
- customer, provider and corporate onboarding state machines;
- versioned legal/communication consent ledger;
- safe deep-link continuation across authentication/onboarding;
- returning-user context selection and last-valid-context behavior;
- context-aware suspension, departure, deletion-pending and termination handling;
- recovery that restores identity but never recreates organization authority;
- device/session management and MFA/AAL2 preservation;
- fully gated initial launch policy with only landing/legal/privacy/help/auth public;
- phone-first mobile UX and equivalent focused desktop UX;
- privacy-by-design/data-minimization and no secret/token persistence in D1/R2.

## Phase 5 requirements summary

The full contract is in `docs/PHASE-4-5-AND-5-IMPLEMENTATION.md`. At minimum Phase 5 must provide:

- server-controlled canonical booking state machine and append-only booking timeline;
- customer/provider/support/trust/finance/operations booking projections over the same booking object;
- Booking Operations queue, filters, assignment/SLA/risk signals and controlled interventions;
- canonical case object linked to booking/customer/provider/settlement without duplicating them;
- case categories, priority/severity, controlled state machine, assignment, notes/evidence policy, SLA/escalation and resolution/closure;
- case-scoped authority that never becomes global access;
- consent-aware customer/provider communication metadata;
- desktop-dense operational UI and mobile critical-action UI;
- negative tenant/field/permission tests and append-only audit history.

## Definition of implementation discipline

Every phase must:

- start from the current green mainline behavior;
- introduce additive migrations before destructive cleanup;
- preserve old URLs through explicit redirects where applicable;
- add negative authorization tests, not only happy-path tests;
- keep all money server-priced and integer-based;
- keep historical booking/settlement snapshots immutable;
- prove tenant and field isolation;
- keep browser/local storage non-authoritative;
- pass the full production build and test suite before the phase is considered complete;
- document any deployment gate that source code alone cannot prove.

For Phase 4.5 + Phase 5 specifically, completion additionally requires a private UAT Site version built from the exact reviewed Git commit, with the Sessions-native gateway, returning-user behavior, Booking Ops and Cases exercised against the deployed application before Phase 6 begins.
