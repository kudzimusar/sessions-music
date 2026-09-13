# Sessions Phase 1–5 UI/UX Correction

Status: IMPLEMENTED SOURCE CORRECTION — REQUIRES PRIVATE HOSTED UAT
Date: 13 September 2026
Phase boundary: Phase 5 remains complete; Phase 6 has not started.
Visual revision: `phase1-5-native-desktop-v1`

## Why this correction exists

Version 17 proved the Phase 1–5 data, identity and operational architecture, but private UAT showed that customer/provider mobile had inherited too much responsive web/PWA composition. The product looked like desktop blocks collapsed onto a phone instead of a mobile application with its own navigation and task model.

This correction implements the binding rules in `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md` rather than postponing the distinction until Phase 10.

## Implemented product surfaces

### Customer native-mobile prototype

The `/mobile` family is now a dedicated app-style interaction tree rather than a phone mode of the desktop registry:

- `/mobile` — native home/discovery;
- `/mobile/search` — full-screen search and filter flow;
- `/mobile/sessions` — customer booking/session list;
- `/mobile/session/:id` — native booking/session detail and bounded cancellation;
- `/mobile/notifications` — native booking/service update list;
- `/mobile/saved` — honest saved-state placeholder until canonical favourites storage exists;
- `/mobile/profile` — mobile profile/settings gateway;
- `/mobile/studio/:id` — native studio detail;
- `/mobile/studio/:id/book` — native booking task.

The mobile studio, booking, session and notification flows remain inside `/mobile/...`; they no longer deliberately hand the customer into the desktop registry after the first tap.

The booking screen reuses `BookingRequestV3` and the existing quote/inventory APIs. The correction changes composition, not booking authority. Real server quotes, inventory validation, recurrence rules, add-ons and booking mutations remain canonical. Session cancellation uses the existing authorized `bookingStatus` mutation and server validation; the native UI does not manufacture a parallel cancellation rule.

Native interaction characteristics now include:

- safe-area-aware top/bottom chrome;
- fixed bottom-tab navigation;
- full-screen task routes;
- edge-to-edge media hierarchy;
- horizontal app-style discovery rails;
- native list rows rather than dashboard-card grids;
- sticky booking CTA on studio detail;
- app-style loading and empty states;
- no desktop sidebar/table dependency;
- no fake favourite or room-live controls where canonical backend state does not yet exist.

### Provider native-mobile prototype

Provider daily operations now have their own bounded mobile surface:

- `/mobile/provider` — Today dashboard/timeline;
- `/mobile/provider/requests` — pending booking requests with accept/decline;
- `/mobile/provider/rooms` — quick operational room reference;
- `/mobile/provider/more` — boundary to desktop management.

Provider mobile reuses the same registry/booking backend and server authorization. It does not create a provider-mobile booking ledger.

Dense configuration intentionally remains on the PWA:

- room setup;
- full pricing configuration;
- long-range calendar administration;
- verification;
- staff administration;
- reporting and advanced provider settings.

### Desktop/PWA

The authenticated root `/` is now explicitly the desktop/browser registry/PWA rather than rendering the mobile customer composition.

Existing desktop routes such as `/studios`, `/studio/:id`, `/map`, `/requests`, `/manage`, provider configuration and account/security continue as browser/PWA surfaces over the same backend.

The legacy responsive `sessions-phone-view` session flag is cleared by the production route guard so desktop/PWA cannot silently inherit the old phone-mode composition.

### Corporate

Corporate remains the existing desktop/tablet operational control plane. Booking Operations and Cases keep their dense queue/master-detail design because that is appropriate to `corporate-desktop`.

This correction does not start Phase 6 and does not manufacture full Corporate mobile parity.

## Onboarding correction

On phones, customer/provider onboarding now renders as focused app-style screens:

- authenticated onboarding hides the desktop explanatory story panel;
- form/card chrome is flattened into a full-screen interaction;
- customer/provider context rows behave like app navigation rows;
- provider onboarding becomes a single-column mobile flow without desktop card framing.

Desktop keeps the wider explanatory/two-panel PWA presentation.

Corporate remains absent from public self-selection. Trusted corporate invitations may still render their private staff setup journey after the server has established the relationship.

## Preserved authority and data boundaries

This correction does not change:

- Supabase Auth as production identity/factor/session authority;
- D1 as Sessions application and marketplace state;
- R2 as media/evidence storage;
- canonical `studio_bookings` ownership;
- server quote calculation;
- provider price sovereignty;
- booking slot/inventory validation;
- case/booking operation authorization;
- Corporate deny-by-default authorization;
- Phase 5 migrations through `0022_identity_mirror_hardening.sql`.

## Phase 1–5 landing state

Phase 1 — shared brand tokens plus separate native-mobile and desktop composition are now represented in source.

Phase 2 — workforce/internal organization remains Corporate-only and is not part of public mobile onboarding.

Phase 3 — identity/RBAC remains server-authorized; no mobile or review bypass was introduced.

Phase 4 — Corporate remains a desktop/tablet PWA operational console; public mobile does not inherit its information architecture.

Phase 4.5 — customer/provider onboarding is mobile-app-oriented on phones and web-oriented on desktop; Corporate remains invitation-bound.

Phase 5 — customer booking uses the native task stack while Booking Operations/Cases stay desktop-dense. Provider mobile can accept/decline booking requests through the existing authorized booking mutation.

## UAT required before Phase 6

A new private ChatGPT Sites version must be created from the exact green merged commit. UAT should inspect these separately:

### Native customer

- `/mobile`
- `/mobile/search`
- `/mobile/studio/<known-studio-id>`
- `/mobile/studio/<bookable-studio-id>/book`
- `/mobile/sessions`
- `/mobile/session/<known-booking-id>`
- `/mobile/notifications`
- `/mobile/saved`
- `/mobile/profile`

### Native provider

- `/mobile/provider`
- `/mobile/provider/requests`
- `/mobile/provider/rooms`
- `/mobile/provider/more`

### Desktop/PWA

- `/`
- `/studios`
- `/studio/<known-studio-id>`
- `/manage`
- `/account`

### Corporate desktop

- `/corporate`
- `/corporate/booking-ops`
- `/corporate/cases`

The mobile and desktop surfaces must be reviewed independently. A correct desktop screen cannot certify native-mobile quality and vice versa.

## Remaining non-UI dependency

Live Sessions Supabase migration/configuration remains a separate deployment dependency until the actual Sessions Supabase project is positively identified. The unrelated `church-os-dev` project remains out of scope and must not be touched.

Corporate owner/reviewer access is intentionally handled after this UI correction is green and landed, using a legitimate attributable staff/reviewer assignment or a clearly isolated demo surface. No hard-coded owner bypass is permitted.
