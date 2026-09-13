# Version 18 UAT Findings — Phase 1–5

Status: CORRECTION IN PROGRESS
Date: 13 September 2026
Hosted baseline: Version 18
Baseline commit: `15940d47279fa2578dd8dc8251327b1fafbdbe42`
Phase: 5 — Phase 6 not started

## Findings from native-mobile review

### 1. Customer bottom navigation must persist

The customer-native tab bar is part of the app shell, not just selected root screens. It must remain fixed across Home, Search, studio detail, booking, Sessions, session detail, Notifications, Saved and Profile. Detail/task screens may add their own contextual header or CTA above the tab bar, but must not discard the app-level navigation.

### 2. Identity and workspace presentation

Sessions uses one human identity. Personal/customer, provider and Corporate are authorized contexts/relationships, not separate user accounts.

The native Profile surface should present the shared identity concisely and list active authorized workspaces. Provider and Corporate operational data belongs inside those contexts, while identity/contact/security/session truth remains shared with desktop/PWA account surfaces.

### 3. Shared data and media

Native and desktop surfaces must project the same canonical records. Differences are permitted in layout, navigation, density, motion and interaction composition only.

Native studio screens must use canonical stored studio/room media when it exists. A platform-branded truthful fallback may be used when no media has been supplied. Generic imagery selected merely from service type must not impersonate actual studio media.

This rule also applies to studio facts, services, equipment, rooms, rates, availability, bookings, notifications, provider membership and security state.

### 4. Sessions logo

The canonical Sessions mark is `public/favicon.svg`. Customer native, provider native and desktop/PWA brand chrome should render the same mark. Surface-specific sizing/background treatment may vary only where the mark itself remains recognizable and consistent.

### 5. Private UAT manifest request

Version 18 private UAT produced repeated `manifest.webmanifest` HTTP 401 console messages. The correction keeps the PWA manifest and requests it using a credentialed manifest link (`crossOrigin="use-credentials"`) rather than weakening protected application routes.

This must be re-tested on the next private deployment. If the ChatGPT Sites private audience boundary still rejects the manifest before the application receives the request, record it as a hosting/private-UAT limitation; do not make marketplace or Corporate routes public to silence the console error.

## Provider monetization requirement captured for Phase 6

Provider-funded featured placement and promoted services are recorded in `docs/PHASE-6-PROVIDER-MONETIZATION-REQUIREMENTS.md`. No payment, sponsored ranking or campaign state is activated by this Phase 5 correction.

## Next hosted UAT — iOS and Android

Once this correction is green, merged and deployed as a new private Site version, run the same acceptance path in both an iOS simulator and an Android simulator.

### Customer native path

1. Open `/mobile` and verify safe areas, canonical mark and fixed bottom nav.
2. Scroll Home completely; tab bar must remain fixed.
3. Open Search; scroll results and switch filters; tab bar must remain fixed.
4. Open a studio; verify actual canonical media or truthful branded fallback, shared facts and Search tab active.
5. Open booking; verify the booking task remains inside `/mobile/...`, shared server quote/inventory behavior, and tab bar remains available.
6. Open Sessions and a session detail; Sessions tab remains active.
7. Open Notifications; Profile tab remains active and notifications use canonical backend state.
8. Open Profile; verify shared identity plus only actually-authorized workspace contexts.
9. Rotate/re-size where simulator supports it; no desktop navigation should replace native composition.

### Provider native path

1. Open `/mobile/provider` with a legitimate provider context.
2. Verify canonical Sessions mark plus provider-context labeling.
3. Check Today, Requests, Rooms and More; provider bottom tabs persist.
4. Accept/decline only through existing authorized booking mutations.
5. Confirm advanced configuration continues to hand off to desktop/PWA rather than being squeezed into native mobile.

### Cross-surface alignment

For at least one studio and one booking, compare native mobile and desktop/PWA:

- same studio identity and factual description;
- same canonical images/media;
- same rooms/equipment/services;
- same provider-controlled rates;
- same availability/booking state;
- same user identity/contact/security facts;
- same authorized workspace relationships.

The presentation may differ. The underlying facts must not.

### Console/network checks

- no unexpected hydration/runtime errors;
- manifest request succeeds with credentials, or any host-level private-boundary failure is recorded explicitly;
- anonymous protected APIs remain 401/403/redirected as designed;
- no restricted media leaks through direct URL requests;
- no customer route gains provider or Corporate authority from UI state alone.
