# Sessions Repository Implementation Rules

These rules apply to all coding agents, administrators and contributors working in this repository.

Before changing product architecture or UI, read:

1. `docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`
2. `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`
3. `docs/PHASE-1-5-CUSTOMER-SURFACE-CONSOLIDATION.md`
4. the phase-specific implementation document relevant to the task.

Before any Phase 6 finance/monetization implementation, also read `docs/PHASE-6-PROVIDER-MONETIZATION-REQUIREMENTS.md`. That document captures provider-funded featured/service promotion requirements but does not authorize Phase 6 work while the project is still closing Phase 1–5 UAT.

If older documentation conflicts with these files on mobile-vs-web composition, corporate onboarding, brand, identity authority or Phase 1–5 surface rules, the Unified Platform document plus the Surface Separation Amendment and Customer Surface Consolidation take precedence.

## Required surface declaration

Every UI task and pull request must state which surface it changes:

- `customer-native`
- `provider-native`
- `provider-web`
- `corporate-desktop`
- `corporate-critical-mobile`
- `shared-backend`

Do not use "responsive" as a substitute for choosing a surface.

## Customer surface consolidation rule

Customer mobile has one navigation shell and one vocabulary: **Home / Search / Sessions / Profile**.

- `CustomerNative` owns `/mobile/...` in the hosted reference.
- Installed iOS/Android clients must consume the same product/authority contracts without using a WebView/PWA wrapper.
- `/account` is desktop/PWA account administration, not a second mobile product.
- RegistryApp is browser/PWA and must not restore its historical phone-mode bottom navigation.
- Do not reintroduce `CustomerV5`, its mobile home, or its mobile bottom navigation.
- Do not expose Saved as a permanent primary tab until persistence is real and shared across clients.
- Mobile account/security/help must stay inside the mobile Profile navigation stack rather than dropping into desktop Account.
- A workspace switch must perform the canonical server-authorized context mutation before navigation; a plain link is not a workspace switch.

## Native mobile rule

Customer/provider mobile must be designed as a native application interaction model even when prototyped in the current web/Sites runtime.

Reject desktop-first implementations that are merely narrowed or stacked for phones.

Native-mobile work should use app-style navigation stacks, touch-first controls, safe areas, bottom navigation/sheets where appropriate, full-screen task flows and single-purpose screens. Do not introduce desktop sidebars, hover dependencies, wide tables or dashboard-card stacking as the default mobile composition.

The PWA/web implementation remains valid for browser/desktop use, but it is not the definition of the mobile product.

## Brand and media rule

The Sessions product identity is the Sessions mark/wordmark system. A browser favicon/app icon is not automatically the universal in-product logo.

Customer discovery media uses this order:

1. canonical provider-supplied room/studio media;
2. explicitly labelled Sessions editorial/guide imagery;
3. truthful designed fallback.

Never present editorial artwork as if it were an actual photograph of a named studio.

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
- multiple customer shells/navigation vocabularies appear in one journey;
- a review shortcut weakens production authorization;
- Phase 10 is used as a reason to postpone native interaction architecture.

## Release rule

A green build does not certify product-surface quality. UAT must separately review:

- customer/provider native-mobile interaction quality;
- customer desktop/PWA and account quality;
- corporate desktop information density and control quality;
- corporate critical-mobile subset where implemented;
- authorization and data boundaries;
- installed iOS and Android parity before Phase 1–5 can be considered closed across clients.

Do not start Phase 6 while the Phase 1–5 consolidation/native UAT gates remain open.
