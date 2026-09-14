# Sessions UAT — native iOS + Android

This package is the installed React Native/Expo client for Phase 1–5 UAT. It is not the `/mobile` PWA and must never be replaced by a WebView wrapper.

## Product architecture

The native app consumes portable resources from `../../packages/product-core` through the local `@sessions/product-core` package. PWA and desktop remain separate clients over the same Sessions product semantics/backend.

Current native implementation includes:

- Phase 1: native app shell, customer bottom tabs, drill-down/back stack, touch-first CTAs, forms, modal confirmation, loading/error/empty patterns and platform system handling;
- Phase 2: identity projection without creating a second authority;
- Phase 3: personal/provider/corporate workspace projection with corporate locked to trusted authorization;
- Phase 4: bounded provider/mobile operations (`Today`, `Requests`, `Rooms`, `More`) while dense administration remains PWA/desktop;
- Phase 4.5: explicit blocked production-auth adapter boundary until the genuine Sessions Supabase project is identified;
- Phase 5: booking/session/provider interaction flows over canonical booking semantics, with authenticated mutations deliberately blocked until Phase 4.5 is legitimate;
- N0 diagnostics: platform label, `/api/release` verification and an anonymous protected-endpoint probe.

The local UAT fixture module is presentation-only and is explicitly labelled as not being an authority/source of truth. It lets simulator UAT review the Phase 1–5 UI before production native auth is available.

## Local machine execution

Use the Mac that has Xcode and Android Studio installed:

```bash
cd native/sessions-native
npm install
npm run doctor
npm run prebuild
npm run ios
npm run android
```

`prebuild` generates real `ios/` and `android/` projects. `expo run:ios` / `expo run:android` must compile and install real native applications.

## N0 security checks

From the installed app open **Profile → Native diagnostics** and verify:

1. platform is `ios` on the iOS Simulator and `android` on the Android emulator;
2. `/api/release` matches `unified-platform-v1-phase5`, Phase 5 and `phase1-5-native-desktop-v2`;
3. anonymous `GET /api/corporate/overview` remains protected with HTTP 401/403;
4. no browser/PWA/WebView application shell is present.

## Identity boundary

ChatGPT Sites `/welcome` is a private audience gate, not a production native authentication API. Do not import browser cookies or embed `/welcome` in a WebView.

Production native identity is intended to use Sessions Supabase Auth. Until the genuine Sessions project is positively identified, do not enable Phase 4.5 authenticated native integration and do not fake Phase 5 privileged mutations.

Never use or modify `church-os-dev` / `svhxjfearcuqxikzvlyb` for Sessions testing.

## Cross-platform completion rule

Read `../../docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md`. Every feature must account for iOS, Android, PWA, desktop and the shared core. Native simulator/device checks are recorded against the exact Git commit and remain a Work/Desktop execution step.
