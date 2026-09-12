# Phase 4 Review — Corporate Control Plane

Date: 2026-09-12

## Status

**Phase 4 is complete in source. Phase 5 has not started.**

The final implementation head before this review passed the production build and **180/180 tests** in Sessions CI run **#184**. This review is intentionally documentation-only; the documentation head must also remain green before promotion to `main`.

Phase 4 implements the operating-company control plane described in the approved `docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`. It does not create a second marketplace, a second booking system, or a second corporate copy of customer/provider/payment/membership records.

## 1. Corporate information architecture

The shared corporate module registry is the canonical navigation and route contract for:

- Overview
- Organization & People
- Access & Security
- Booking Operations
- Customers
- Provider Operations
- Membership Oversight
- Incidents & Cases
- Finance
- Customer Support
- Trust & Safety
- Marketing & Growth
- Corporate Analytics
- Platform
- Audit & Governance
- Corporate Settings

Navigation is generated from assigned permissions. Unauthorized modules are not rendered as disabled or decorative navigation.

Each module declares an accountable department and optional supporting departments. This answers organizational questions such as “who owns bookings?” without allowing department names to grant authority. Organizational ownership and RBAC remain independent concepts.

## 2. Department workspace context

The corporate homepage now derives visible department workspace context from the modules already assigned to the signed-in identity. A user can therefore see the company functions relevant to their work without receiving unrelated modules.

Current operating ownership includes:

- Marketplace Operations — Booking Operations and Incidents & Cases
- Customer Support — Customers and Support
- Provider Operations — Provider Operations
- Memberships & Retention — Membership Oversight
- Finance — Finance
- Trust & Safety — Trust & Safety
- Growth & Marketing — Marketing & Growth
- Data & Analytics — Corporate Analytics
- Product & Technology — Platform
- Governance / Compliance — Audit & Governance
- Governance / Security — Access & Security
- Executive Office / Governance — Organization and Corporate Settings

These labels are operating-accountability metadata only. Tests explicitly verify that they are not consulted by authorization functions.

## 3. Phase 3 authority corrections discovered by Phase 4

Phase 4 exposed a gap between the earlier narrow office-role model and the role catalogue required by the approved plan. The correction was made in Phase 3 rather than hidden inside Phase 4.

The trusted role catalogue now includes:

- Support Agent / Support Manager
- Trust & Safety / Trust & Safety Manager
- Finance Admin / Finance Manager
- Provider Operations / Provider Operations Manager
- Growth Analyst / Growth Manager
- Data Analyst / Data Admin
- Product Operations
- Governance Reviewer
- Operations Admin
- Corporate Admin
- Super Admin Eligible
- legacy Super Admin for migration compatibility only

Provider Owner, Provider Manager and Provider Staff remain tenant-derived provider authority and are not issued through corporate role administration.

### Scoped authority

`PlatformScopeType` supports organization, department, provider, region, case and team context. The additive Supabase migration introduces `platform_scoped_role_assignments` with RLS, authenticated self-read only and server-controlled mutation. Trusted identity returns scoped assignments separately from global roles.

A scoped assignment **never becomes a global permission grant**. Application policy must explicitly match role + scope type + scope ID before a future scoped action can use it.

The migration is source-complete but has **not been applied or certified against the live Sessions Supabase project from this chat**, because that project is not exposed by the available connector. No unrelated Supabase project was touched.

## 4. Privileged administration

The supported privileged path is now:

`super_admin_eligible` → trusted production identity → AAL2 MFA → current 15-minute privileged session → audited privileged mutation.

Legacy permanent `super_admin` remains readable/revocable for migration compatibility but **cannot be newly granted from the corporate application**. Provider roles and permanent legacy Super Admin authority are absent from the assignment UI and rejected by the role-assignment API.

Access-review visibility and mutation are separated:

- Governance/security staff with `security:read` can inspect Access & Security state.
- Creating reviews, recording decisions, remediating authority and closing reviews additionally require privileged-admin eligibility and a current AAL2 privileged session.
- Role mutations remain intent-audited, externally verified against the Supabase authority source and outcome-audited.
- Existing database invariants continue to prevent impossible access-review states.

## 5. Canonical data and database consistency

Phase 4 read modules project existing canonical records, including:

- `studio_bookings`
- `studio_members`
- `studio_issues`
- `booking_notifications`
- `studio_settlements`
- `studio_registry`
- `studio_audit`
- `corporate_org_events`
- `corporate_security_events`

No `corporate_bookings`, `corporate_customers`, `corporate_memberships`, `corporate_incidents` or other parallel marketplace truth was created.

`drizzle/0017_corporate_control_plane_indexes.sql` is intentionally index-only. It adds read-path indexes for booking, membership and issue control-plane access without creating or copying business records.

## 6. Privacy and leak controls

Phase 4 tightened data minimization instead of relying on UI hiding:

- Booking and membership customer references require separate customer-directory authority.
- Customer projections exclude names, phone numbers, emails, private notes and booking-message contents.
- Finance and Trust can receive required operational booking state without automatically receiving customer references.
- Finance metrics such as settled GMV and platform fees require finance/executive analytics permission, not generic analytics permission.
- Audit actor references are masked and event payloads/session IDs are excluded from the ordinary audit projection.
- Restricted/private responses use `private, no-store` semantics.
- Phase 2 delegation reasons were tightened: ordinary corporate directory readers see responsibility metadata, while sensitive delegation reasons require organization-management authority.
- Restricted/confidential media remains outside browser caches.

## 7. Marketing, analytics, platform and settings boundaries

### Marketing & Growth

Phase 4 exposes only canonical operational signals such as customer count, repeat share, completed sessions, active memberships and bookable supply. It does **not** fabricate CAC, campaign attribution, source/medium, page views, click funnels or conversion attribution. Those require the governed Phase 9 event pipeline.

### Corporate Analytics

Phase 4 provides a bounded operational aggregate snapshot. Financial analytics is independently permission-gated. The event warehouse, metric contracts, attribution model and product analytics remain Phase 9.

### Platform

The Platform module reports non-secret readiness only: identity mode, payment/billing gates, calendar/email/AI readiness and canonical record counts. Credentials, API keys, tokens and secret endpoint values are never returned.

### Corporate Settings

The Settings module exposes non-secret policy/runtime posture from existing authoritative configuration and policy tables. It does not create another settings database. Fee and loyalty mutations remain on their existing separately authorized endpoints, and infrastructure/environment changes remain deployment-controlled.

## 8. Booking, incident, membership and finance phase boundaries

Phase 4 deliberately does not consume later phases:

- **Phase 5** owns the deeper booking command center, canonical case object, assignment, SLA, evidence and escalation workflow.
- **Phase 6** owns deeper finance/membership operations and reconciliation expansion.
- **Phase 7** owns the full provider-organization/RBAC expansion.
- **Phase 9** owns governed product/marketing/warehouse analytics.
- **Phase 10** owns the final native iOS/Android client architecture.
- **Phase 11** owns live integration, deployment and production UAT certification.

Phase 4 may show truthful current operational state for these domains, but it does not simulate later-phase engines.

## 9. Mobile and PWA

Sessions remains mobile-first for customer/provider use, while the corporate control plane is desktop-dense and mobile-operable.

Phase 4 includes:

- sticky permission-generated corporate navigation
- horizontally scrollable mobile module navigation
- safe-area-aware layout
- minimum mobile interaction sizing inherited from the production design system
- mobile transformation of wide tables into labeled record cards
- responsive KPI and department-workspace grids
- Royal Blue / Black / White Phase 1 visual boundary

The PWA remains configured with `/mobile` as its start URL, standalone display and portrait-primary orientation.

The service worker remains intentionally narrow: it only handles the authenticated offline booking-reference endpoint. It does not cache corporate pages, corporate APIs or arbitrary authenticated application traffic.

## 10. Verification

Final implementation gate before this documentation commit:

- production `vinext` build: **passed**
- automated tests: **180 passed / 180 total / 0 failed**
- CI workflow: **Sessions CI run #184**

The suite covers earlier marketplace behavior as well as Phase 4 role separation, scoped-authority non-escalation, canonical data use, Access & Security boundaries, provider/legacy-Super-Admin assignment restrictions, mobile/PWA safety, privacy projection and previous phase regressions.

## 11. Deployment and certification boundary

This repository is bound to the Sessions ChatGPT Sites project through `.openai/hosting.json`, with production D1 `DB` and R2 `BUCKET` bindings.

The Phase 1–4 implementation has intentionally remained on `implementation/unified-platform-v1` until this close-out. That explains why the canonical hosted URL could still show the older `main` implementation during review. The release step after this documentation head is green is to promote the verified Phase 1–4 branch to `main` and then verify the canonical hosted mobile and corporate routes.

This review does **not** claim that the source-only Supabase migration or a real production AAL2 flow has been certified against the live Sessions Supabase project. That remains an explicit production/UAT certification item rather than a hidden Phase 4 claim.

## Decision

Phase 4 is accepted as source-complete when this documentation-only head remains green. No Phase 5 workflow implementation should be added to this branch before promotion.
