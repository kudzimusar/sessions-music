# Sessions Repository Implementation Rules

These rules apply to all coding agents, administrators and contributors working in this repository.

Before changing product architecture or UI, read:

1. `docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`
2. `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`
3. the phase-specific implementation document relevant to the task.

If older documentation conflicts with these files on mobile-vs-web composition, corporate onboarding, brand, identity authority or Phase 1–5 surface rules, the Unified Platform document plus the Surface Separation Amendment take precedence.

## Required surface declaration

Every UI task and pull request must state which surface it changes:

- `customer-native`
- `provider-native`
- `provider-web`
- `corporate-desktop`
- `corporate-critical-mobile`
- `shared-backend`

Do not use "responsive" as a substitute for choosing a surface.

## Native mobile rule

Customer/provider mobile must be designed as a native application interaction model even when prototyped in the current web/Sites runtime.

Reject desktop-first implementations that are merely narrowed or stacked for phones.

Native-mobile work should use app-style navigation stacks, touch-first controls, safe areas, bottom navigation/sheets where appropriate, full-screen task flows and single-purpose screens. Do not introduce desktop sidebars, hover dependencies, wide tables or dashboard-card stacking as the default mobile composition.

The PWA/web implementation remains valid for browser/desktop use, but it is not the definition of the mobile product.

## Corporate rule

Corporate is an internal desktop/tablet operating console with a deliberately bounded critical-mobile subset.

Do not expose Corporate/Admin/Sessions-team self-selection in public customer/provider onboarding.

Corporate access must come from trusted invitation, staff assignment or an already-authorized corporate context. Owner/UAT review access must use a legitimate attributable staff/reviewer identity or an isolated non-production `/demo` surface. Never add a hard-coded owner/admin bypass or shared admin identity.

## Architecture rule

Keep one canonical marketplace and one authority model:

- Supabase Auth: production identity, factors and sessions.
- D1: application/profile/onboarding/consent/lifecycle/marketplace/operations state.
- R2: media/evidence bytes with server-side authorization.

Do not create parallel booking, customer, provider, membership, settlement or case sources of truth for individual surfaces.

## Review rule

Request redesign when:

- mobile is only "responsive desktop";
- Corporate is exposed as a public role choice;
- desktop and native mobile are forced through one page composition despite different task models;
- a mobile layout mechanically stacks desktop cards/tables;
- a review shortcut weakens production authorization;
- Phase 10 is used as a reason to postpone native interaction architecture.

## Release rule

A green build does not certify product-surface quality. UAT must separately review:

- customer/provider native-mobile interaction quality;
- corporate desktop information density and control quality;
- corporate critical-mobile subset where implemented;
- authorization and data boundaries.
