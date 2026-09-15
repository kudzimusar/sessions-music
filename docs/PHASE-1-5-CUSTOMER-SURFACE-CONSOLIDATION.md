# Phase 1–5 Customer Surface Consolidation — Version 20

Status: source consolidation candidate. Phase 6 remains blocked until this source is merged, privately deployed, and passes hosted/mobile/native UAT.

## Why this pass exists

Version 19 proved the Phase 1–5 backend and authorization direction, but UAT exposed competing customer frontend generations: CustomerNative, CustomerV5 account/mobile composition, and RegistryApp phone mode could all appear during one customer journey. Global legacy CSS could also override native dark surfaces. Version 19 is therefore an audit baseline, not the interaction design to copy into iOS and Android.

This consolidation removes those collisions instead of adding more responsive overrides.

## Binding customer surface contract

### Customer mobile reference

`/mobile/...` is one interaction tree owned by `CustomerNative`.

Primary navigation is exactly:

1. Home — `/mobile`
2. Search — `/mobile/search`
3. Sessions — `/mobile/sessions`
4. Profile — `/mobile/profile`

Nested customer routes remain inside that shell, including studio detail, booking, individual session detail, notifications, account/security and help.

`Saved` is not exposed as a primary tab until a real persistence contract exists. The old `/mobile/saved` route redirects to Search rather than advertising a placeholder feature.

### Desktop/PWA account

`/account` is a desktop/browser account surface. It reads the same registry, onboarding, identity/security and relationship state but does not imitate the native mobile layout or install a second mobile navigation system.

Mobile Profile must never open a second customer shell merely to display account/security data. Mobile security is `/mobile/profile/security` and uses the same security authority/component inside native composition.

### Registry/PWA

RegistryApp remains browser/PWA. Its historical `phone-mode` navigation is retired as a product surface. Responsive layout may keep browser pages usable on a narrow viewport, but it must not become another customer mobile app.

### Provider mobile

`/mobile/provider/...` remains the bounded daily-operations client: Today, Requests, Rooms and More. Dense setup/reporting remains `/manage` on provider web. Provider mobile account/security returns to the customer-native Profile security screen rather than creating another account UI.

## Identity and workspace rule

There is one Sessions identity. Personal/provider/corporate are authorized contexts, not separate accounts.

A UI control presented as a workspace switch must perform the canonical server mutation (`setLastContext`) and verify authorization before navigation. A plain link must not pretend to switch context.

Corporate remains invitation-bound and fail-closed. No owner bypass is introduced by this consolidation.

## Media and brand rule

Studio/provider media hierarchy for customer discovery is:

1. provider-supplied canonical room/studio media when available;
2. clearly labelled Sessions editorial/guide imagery when provider media is absent;
3. truthful designed fallback only when neither is available.

Editorial imagery must never be presented as a photograph of a specific provider.

The Sessions AudioLines mark plus SESSIONS wordmark is the product brand treatment. `favicon.svg` remains an app/browser icon asset; it is not the universal product logo.

## Native composition rule

The hosted `/mobile` tree is a design/reference client, not a substitute for installed iOS/Android binaries. It must nevertheless use native-mobile composition principles:

- persistent bottom tabs;
- contextual back navigation and deep-link fallback;
- safe areas;
- edge-to-edge media where appropriate;
- native rows/lists instead of dashboard-card piles;
- one dominant CTA;
- centered touch-friendly discovery rails;
- explicit loading, empty and error states.

The current hosted reference also exposes a history-forward control to make browser UAT/history behaviour observable. Installed iOS/Android clients should follow platform-native navigation-stack conventions rather than copying browser chrome mechanically.

## Cross-client alignment with native PR #22

Draft PR #22 (`native/phase1-5-simulator-runtime`) is a separate implementation track under the same product roadmap. Its native customer vocabulary must remain Home / Search / Sessions / Profile and it must consume the same identity/workspace/marketplace contracts.

After this consolidation lands on `main`, PR #22 must rebase onto the landed commit before final Phase 1–5 native certification. It must not reintroduce CustomerV5, Registry phone-mode navigation, fake Saved state, or a WebView/PWA wrapper.

## Release/UAT gate

This source targets the next private Sites candidate, referred to as Version 20 for planning. A source marker does not mean Version 20 is deployed.

Before Phase 6:

1. exact PR head CI, merge candidate and release gate must pass;
2. merged `main` must pass immutable post-merge verification;
3. a new private Sites version must be stamped from that exact merged commit;
4. customer mobile, provider mobile, desktop/PWA and Corporate authorization boundaries must be UAT-tested separately;
5. PR #22 must rebase and complete installed iOS/Android UAT at an exact SHA;
6. the Sessions Supabase project and native identity closeout must be verified without touching unrelated projects.

Phase 6 finance/monetization remains out of scope until those Phase 1–5 gates pass.
