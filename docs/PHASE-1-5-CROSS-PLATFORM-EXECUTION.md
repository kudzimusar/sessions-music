# Phase 1–5 cross-platform execution rule

Status: active repository rule for Phase 1–5 UAT. This document does not authorize Phase 6.

## One product, four clients

Sessions Phase 1–5 is developed and reviewed as one product with four first-class client surfaces:

1. native iOS;
2. native Android;
3. PWA/mobile browser;
4. desktop/web.

Native mobile is the primary interaction-design focus. PWA and desktop remain synchronized first-class clients. A feature is not complete merely because one surface works.

The shared product core owns portable contracts and semantics. Platform clients own platform-appropriate presentation and OS integration.

## Shared product core

`packages/product-core` is the first portable package boundary. It contains only runtime-neutral resources: release provenance, design tokens, navigation semantics, workspace context semantics, booking-state transitions, auth boundaries and the parity ledger.

Portable product logic may move into this package incrementally when doing so does not pull browser, Node, Cloudflare, database or React Native APIs into the package.

Keep these shared when practical:

- API/request and response contracts;
- domain types and pure validation;
- booking/workspace/provider business rules;
- permission and RBAC semantics;
- release metadata and feature flags;
- design tokens and brand semantics;
- analytics event names and error codes.

Keep these platform-specific:

- native navigation implementation and back gestures;
- safe-area/system-bar behavior;
- keyboard, haptics, notifications and device permissions;
- secure native credential persistence;
- browser session persistence and PWA installation;
- desktop tables, sidebars and high-density administration.

## Native composition rule

The installed iOS/Android application must render React Native views. The Sessions website must never become the native application shell through a WebView, WKWebView, Android WebView, iframe or packaged PWA.

The native interaction baseline is:

- persistent bottom tabs for primary customer/provider destinations;
- stack-style drill-down and platform back behavior;
- single-purpose task screens;
- modal/sheet confirmation for focused actions;
- one dominant primary CTA where practical;
- minimum practical targets of 44pt on iOS and 48dp on Android;
- explicit idle/loading/success/empty/error/disabled states;
- keyboard-aware forms and inline validation;
- pull-to-refresh where useful;
- destructive confirmation before irreversible actions.

## Phase boundaries

### Phase 1 — foundation

Shared design/release/navigation semantics plus native app shell, safe areas, customer tabs, state patterns and CTA hierarchy. PWA and desktop retain their distinct compositions.

### Phase 2 — identity

One canonical identity model. Native projects authorized account/workspace state; it does not create a second identity authority.

### Phase 3 — workspace

Personal/provider/corporate contexts are projections of the same authority model. Corporate remains authorized-only and is never a public self-selected role.

### Phase 4 — advanced/corporate

Every capability is classified FULL, MOBILE, DESKTOP, SHARED or DEFERRED. Dense corporate administration remains desktop/PWA where phone presentation would weaken usability. Native implements the bounded critical subset.

### Phase 4.5 — production authentication

Native production auth remains blocked until the genuine Sessions Supabase project is positively identified. The ChatGPT Sites `/welcome` audience gate is not native auth. Browser cookies must never be imported into the native app. `church-os-dev` / `svhxjfearcuqxikzvlyb` must never be used for Sessions testing or migration.

### Phase 5 — booking/provider operations

Booking/provider contracts and state transitions remain canonical. Native uses mobile-first service, availability, confirmation, session timeline and provider action patterns. Authenticated mutations remain certification-blocked until Phase 4.5 has a legitimate Sessions identity environment.

## Current parity ledger

`✅` = existing surface contract passes repository checks. `🧪` = implementation exists but local native simulator/device certification is required. `⛔` = blocked by a named external authority/configuration requirement.

| Capability | iOS | Android | PWA | Desktop |
| --- | --- | --- | --- | --- |
| Phase 1 foundation/navigation | 🧪 | 🧪 | ✅ | ✅ |
| Phase 2 identity projection | 🧪 | 🧪 | ✅ | ✅ |
| Phase 3 workspace projection | 🧪 | 🧪 | ✅ | ✅ |
| Phase 4 bounded operations | 🧪 | 🧪 | ✅ | ✅ |
| Phase 4.5 production auth | ⛔ | ⛔ | 🧪 | 🧪 |
| Phase 5 booking/provider UX/contracts | 🧪 | 🧪 | ✅ | ✅ |
| Phase 5 authenticated native mutations | ⛔ | ⛔ | ✅ | ✅ |

Native `🧪` becomes `✅` only after the exact commit is compiled, installed and exercised on the relevant simulator/device. Repository CI is necessary but cannot substitute for that check.

## PR rule

Every relevant PR must declare impact for:

- iOS native;
- Android native;
- PWA;
- desktop/web;
- shared core/backend.

`Not applicable` requires a product/architecture reason. It cannot mean the platform was forgotten.

## Work/Desktop handoff boundary

Chat/repository agents should implement all repository-safe work they can. Work/Desktop is the execution boundary for machine-local Xcode, Android Studio, simulator/emulator, signing, native project generation and final deployment evidence. Handoff does not redefine the product or replace repository implementation; it certifies and aligns the exact commit already prepared for execution.
