# Sessions Unified Platform Implementation v1

Status: APPROVED REFERENCE
Approved direction: 11 September 2026

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

## Implementation sequence

- Phase 0 — baseline, reference lock, migration safety and regression gates.
- Phase 1 — design-system and navigation migration to Black/Royal Blue/White with responsive/native-compatible tokens.
- Phase 2 — Sessions corporate organization/workforce model: departments, positions, reporting lines, employment records, deputies/delegations.
- Phase 3 — workforce IAM/RBAC expansion, privileged-session controls, access reviews and field/scope policy.
- Phase 4 — corporate control plane: organization, bookings, customers, providers, memberships, incidents, finance, analytics and audit navigation with permission-generated modules.
- Phase 5 — canonical booking-operations and case/incident workflows.
- Phase 6 — finance, membership oversight and retention operations.
- Phase 7 — provider-organization administration and provider-scoped RBAC.
- Phase 8 — Search & Discovery v2.
- Phase 9 — governed product/marketing/operational analytics pipeline and metric layer.
- Phase 10 — native mobile application architecture and customer/provider migration.
- Phase 11 — hardening, UAT, production identity/payment/integration certification and release.

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

This checkpoint is intentionally concise. It exists so implementation agents encounter the approved architectural rules inside the repository before modifying code.