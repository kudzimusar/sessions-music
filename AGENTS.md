# Sessions Repository Implementation Rules

These rules apply to all coding agents, administrators and contributors working in this repository.

Before changing product architecture or UI, read:

1. `docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`
2. `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`
3. `docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md`
4. the phase-specific implementation document relevant to the task.

Before any Phase 6 finance/monetization implementation, also read `docs/PHASE-6-PROVIDER-MONETIZATION-REQUIREMENTS.md`. That document captures provider-funded featured/service promotion requirements but does not authorize Phase 6 work while the project is still closing Phase 1–5 UAT.

If older documentation conflicts with these files on mobile-vs-web composition, corporate onboarding, brand, identity authority or Phase 1–5 surface rules, the Unified Platform document plus the Surface Separation Amendment and Cross-Platform Execution rule take precedence.

## Mandatory four-client impact declaration

Every Phase 1–5 feature must account for all four client surfaces plus the shared core:

- native iOS;
- native Android;
- PWA/mobile browser;
- desktop/web;
- shared product core/backend.

Native mobile is the primary interaction-design focus, while PWA and desktop remain synchronized first-class clients. `Not applicable` needs an explicit product/architecture reason and must never mean a platform was forgotten.

## Required surface declaration

Every UI task and pull request must also state which product composition it changes:

- `customer-native`
- `provider-native`
- `provider-web`
- `corporate-desktop`
- `corporate-critical-mobile`
- `shared-backend`

Do not use "responsive" as a substitute for choosing a surface.

## Shared product-core rule

Put runtime-neutral contracts, release provenance, design tokens, pure validation, booking/workspace semantics, permissions and other reusable business rules in `packages/product-core` when safe. Do not pull browser DOM APIs, Cloudflare/Node server APIs, database drivers or React Native APIs into the shared package.

Share product semantics aggressively; do not force presentation code to be shared when it would create poor native, PWA or desktop UX.

## Native mobile rule

Customer/provider mobile must be designed as a native application interaction model even when prototyped in the current web/Sites runtime.

Reject desktop-first implementations that are merely narrowed or stacked for phones.

Native-mobile work should use app-style navigation stacks, touch-first controls, safe areas, bottom navigation/sheets where appropriate, full-screen task flows and single-purpose screens. Use a practical minimum touch target of 44pt on iOS and 48dp on Android. Do not introduce desktop sidebars, hover dependencies, wide tables or dashboard-card stacking as the default mobile composition.

The installed iOS/Android app must remain a genuine React Native runtime. Never make the Sessions website, `/mobile` PWA or any browser surface the native app shell through WebView/WKWebView/Android WebView/iframe packaging.

The PWA/web implementation remains valid for browser use, but it is not the definition of the installed mobile product.

## Corporate rule

Corporate is an internal desktop/tablet operating console with a deliberately bounded critical-mobile subset.

Do not expose Corporate/Admin/Sessions-team self-selection in public customer/provider onboarding.

Corporate access must come from trusted invitation, staff assignment or an already-authorized corporate context. Owner/UAT review access must use a legitimate attributable staff/reviewer identity or an isolated non-production `/demo` surface. Never add a hard-coded owner/admin bypass or shared admin identity.

## Authentication boundary

Supabase Auth is the intended production identity authority. Native browser-cookie import and the ChatGPT Sites `/welcome` audience session are not production native authentication mechanisms.

Until the real Sessions Supabase project is positively identified, Phase 4.5 native auth and authenticated Phase 5 native mutations remain blocked. Never use or modify `church-os-dev` / `svhxjfearcuqxikzvlyb` for Sessions testing.

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

- installed native iOS interaction quality;
- installed native Android interaction quality;
- PWA/mobile-browser quality;
- desktop information density and control quality;
- corporate critical-mobile subset where implemented;
- authorization and data boundaries.

Native simulator/device certification must record the exact Git commit. Work/Desktop may execute machine-local Xcode/Android Studio/simulator/signing steps, but that handoff does not replace repository implementation or change these product rules.
