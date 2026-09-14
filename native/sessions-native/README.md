# Sessions UAT — native iOS + Android

This package is the real Expo/React Native Phase 1–5 UAT client. It is **not** the `/mobile` PWA, does not embed the Sessions website, and must never be replaced by a WebView wrapper.

## Architecture

The client uses Expo Router over React Native screens with a native stack and stable customer bottom tabs. It consumes portable product contracts from `../../packages/product-core`; PWA and desktop remain separate presentation clients over the same Sessions backend/domain truth.

Current native scope:

- **Phase 1:** Expo Router stack + customer tabs, safe areas, app-style single-purpose screens, touch-first CTAs, keyboard handling, haptics, loading/empty/error/offline states and accessible field names;
- **Phase 2:** one-identity projection without a second identity authority;
- **Phase 3:** Personal / Provider / authorized-only Corporate workspace semantics;
- **Phase 4:** bounded provider daily operations (`Today`, `Requests`, `Rooms`, `More`) plus an isolated demo-only Corporate critical-mobile subset; dense administration stays desktop/PWA;
- **Phase 4.5:** Sessions gateway, customer/provider intent, safe continuation, recovery/device-session posture and secure-device session adapter. Live production auth remains blocked until the genuine Sessions Supabase project is identified;
- **Phase 5:** mobile time-inventory, booking review, session references, rebook/repeat/share, provider operations and bounded urgent case actions. Authenticated mutations remain fail-closed while Phase 4.5 is blocked;
- **Sessions AI:** the same shared `/api/planner` intent-interpreter used by web/PWA. Natural-language requirements require explicit consent, remain editable, include music-specific equipment such as drums/PA, and are checked against canonical Sessions data. AI never books and never invents marketplace facts;
- **Diagnostics:** platform identity, `/api/release` provenance and anonymous protected-endpoint probe.

The local UAT fixture module is presentation-only and visibly non-authoritative. It exists to review native composition before production identity/data are available; it must not become a second product database.

## Dependency policy

Direct native/runtime dependencies are pinned to the exact versions validated for this branch (Expo SDK 57 / React Native 0.86.3 / React 19.2.3 and associated Expo modules). CI runs Expo Doctor and a production Expo Router export on every relevant PR head and audits shipped dependencies for high-severity issues.

A native `package-lock.json` is generated and uploaded with Chromium evidence today but is not yet committed to this branch. Preserve it in execution evidence. Do not claim full transitive reproducibility until the lockfile is committed and CI can switch the native job from `npm install` to `npm ci`.

## Local machine execution

Use the Mac with Xcode and Android Studio installed, against the exact reviewed PR head:

```bash
git checkout native/phase1-5-simulator-runtime
git pull --ff-only
git rev-parse HEAD

cd native/sessions-native
npm install --include=dev
npm run doctor
npm run prebuild
npm run ios
npm run android
```

`prebuild` generates real `ios/` and `android/` projects. `expo run:ios` / `expo run:android` must compile and install real native applications; a browser preview is not native certification.

## Chromium projection

Chromium is an extra regression surface over the **same Expo Router source**, not the product runtime. It intentionally has no native-auth persistence and does not probe hosted auth cross-origin.

```bash
npm run web:export
npx playwright install chromium
npm run test:chromium
```

Playwright covers 390×844, 412×915 and 320×568 phone viewports and rejects runtime/console errors, horizontal overflow, iframe/WebView-style shells, broken accessibility labels, generic appointment-style booking states, missing AI consent/equipment controls, public Corporate self-selection and oversized desktop composition on mobile.

## Native security checks

From the installed app open **Profile → Native diagnostics** and verify on both platforms:

1. platform is `ios` on iOS Simulator and `android` on the Android emulator;
2. `/api/release` matches `unified-platform-v1-phase5`, Phase 5 and `phase1-5-native-desktop-v2`;
3. anonymous `GET /api/corporate/overview` remains protected with HTTP 401/403;
4. the application shell is React Native, not Safari/Chrome/PWA/WebView;
5. safe areas, Android system bars/back behavior, keyboard movement and touch targets are correct on the installed binary.

## Identity boundary

ChatGPT Sites `/welcome` is a private audience gate, not a production native authentication API. Never import browser cookies or embed `/welcome` in a WebView.

Production native identity is intended to use Sessions Supabase Auth. Until the genuine Sessions project is positively identified, do not enable Phase 4.5 authenticated native integration and do not fake Phase 5 privileged mutations.

Never use or modify `church-os-dev` / `svhxjfearcuqxikzvlyb` for Sessions testing.

## Known non-fakeable gaps

See `../../docs/PHASE-1-5-NATIVE-RED-TEAM-REPORT.md`. In particular:

- exact-commit iOS Simulator and Android emulator certification is still mandatory;
- live native auth remains blocked on the real Sessions Supabase environment;
- provider equipment authority is currently studio-level, so heterogeneous room-level gear must not be overclaimed until the canonical model is extended;
- production marketplace cards/details still need authorized canonical room photography rather than UAT placeholders;
- real push registration belongs behind legitimate identity, device and consent authority.

## Cross-platform completion rule

Read `../../docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md`. Every Phase 1–5 change must account for iOS, Android, PWA, desktop and shared core. A green Chromium/build result is necessary but does **not** replace exact native simulator/device evidence.
