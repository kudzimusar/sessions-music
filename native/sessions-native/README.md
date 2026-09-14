# Sessions UAT — native iOS + Android

This package is the real Expo/React Native Phase 1–5 UAT client. It is **not** the `/mobile` PWA, does not embed the Sessions website, and must never be replaced by a WebView wrapper.

## Architecture

The client uses Expo Router over React Native screens with a native stack and stable customer bottom tabs. It consumes portable product contracts from `../../packages/product-core`; PWA and desktop remain separate presentation clients over the same Sessions backend/domain truth.

Current native scope:

- **Phase 1:** Expo Router stack + customer tabs, safe areas, app-style single-purpose screens, touch-first CTAs, keyboard handling, haptics, loading/empty/error/offline states and accessible field names;
- **Phase 2:** one-identity projection without a second identity authority;
- **Phase 3:** Personal / Provider / authorized-only Corporate workspace semantics;
- **Phase 4:** bounded provider daily operations (`Today`, `Requests`, `Rooms`, `More`) plus an isolated demo-only Corporate critical-mobile subset; dense administration stays desktop/PWA;
- **Phase 4.5:** verified Sessions Supabase project pinning, real native email/phone OTP, encrypted persistent Supabase session storage, safe continuation, canonical profile/consent onboarding, recovery/device-session posture and server-derived workspace authority. Live certification remains blocked while the verified project is inactive and cannot expose its publishable runtime configuration;
- **Phase 5:** mobile time-inventory, booking review, session references, rebook/repeat/share, provider operations and bounded urgent case actions. Privileged mutations remain fail-closed until Phase 4.5 is live and certified;
- **Sessions AI:** the same shared `/api/planner` intent-interpreter used by web/PWA. Natural-language requirements require explicit consent, remain editable, include room-specific music equipment such as drums/PA, and are checked against canonical Sessions data. AI never books and never invents marketplace facts;
- **Diagnostics:** platform identity, `/api/release` provenance and anonymous protected-endpoint probe.

The local UAT fixture module is presentation-only and visibly non-authoritative. It exists to review native composition before production identity/data are available; it must not become a second product database.

## Verified Sessions identity authority

The genuine project has been positively identified as:

- project: `Sessions`
- project ref: `meswozsllmmiqjwljvnb`
- URL: `https://meswozsllmmiqjwljvnb.supabase.co`

The project is currently inactive. A restore attempt was rejected by Supabase because the organization has reached its active free-project capacity, so no publishable key or live schema change has been guessed or copied from another project.

Native code accepts runtime auth configuration only when the URL/ref match this exact project. `church-os-dev` / `svhxjfearcuqxikzvlyb` remains explicitly forbidden.

Supabase remains the identity/session authority only. Marketplace studios, rooms, room equipment, booking inventory and media remain canonical in Sessions D1/R2; do not create a second marketplace schema in Supabase.

## Room equipment and media truth

Room equipment is now part of the canonical `StudioRoom` aggregate. Provider room editing, registry validation and the canonical planner use the same bounded equipment vocabulary. Studio-level free text remains useful as legacy/display metadata but **never proves that a specific room contains gear**. Equipment-aware planner matches fail closed when the room has no confirmed equipment list.

Canonical room photography already uses Sessions media records linked to the studio and room. Native discovery renders only trusted same-origin `/api/media/<uuid>` resources. Arbitrary remote imagery is rejected; if a provider has not published canonical media, the app uses a neutral Sessions-branded fallback rather than scraped, stock or AI-fabricated room photography.

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

Review and return any generated `ios/`, `android/`, lockfile or configuration changes. Any changed repository file creates a new exact SHA and requires the complete repository/Chromium release chain again before merge.

## Installed native Maestro acceptance

Playwright verifies the Expo web projection, but installed-native certification uses Maestro against the real `Sessions UAT` application (`com.sessionstech.sessions.uat`). After each iOS Simulator or Android Emulator build is installed, run:

```bash
maestro test .maestro/phase1-5-smoke.yml
maestro test .maestro/native-diagnostics.yml
maestro test .maestro/phase5-operations.yml
```

These flows cover:

- installed app launch and native gateway;
- real phone/email sign-in screen and verified Sessions project identity;
- native back navigation and customer tabs;
- Sessions AI discovery entry and planner;
- studio → valid inventory → booking review;
- bounded provider daily operations;
- `/api/release` provenance from the installed runtime;
- anonymous Corporate security probe requiring HTTP 401/403.

A green Chromium projection is not a substitute for these installed-binary flows. Current Expo guidance also recommends Maestro against built `.app`/`.apk` artifacts for simulator/emulator E2E testing.

## Chromium projection

Chromium is an extra regression surface over the **same Expo Router source**, not the product runtime. It intentionally has no native-auth persistence and does not probe hosted auth cross-origin.

```bash
npm run web:export
npx playwright install chromium
npm run test:chromium
```

Playwright covers 390×844, 412×915 and 320×568 phone viewports and rejects runtime/console errors, horizontal overflow, iframe/WebView-style shells, broken accessibility labels, generic appointment-style booking states, missing AI consent/equipment controls, public Corporate self-selection and oversized desktop composition on mobile.

## Native security checks

From the installed app open **Native diagnostics** and verify on both platforms:

1. platform is `ios` on iOS Simulator and `android` on the Android emulator;
2. `/api/release` matches `unified-platform-v1-phase5`, Phase 5 and `phase1-5-native-desktop-v2`;
3. anonymous `GET /api/corporate/overview` remains protected with HTTP 401/403;
4. the application shell is React Native, not Safari/Chrome/PWA/WebView;
5. safe areas, Android system bars/back behavior, keyboard movement and touch targets are correct on the installed binary.

## Identity boundary

ChatGPT Sites `/welcome` is a private audience gate, not a production native authentication API. Never import browser cookies or embed `/welcome` in a WebView.

Production native identity uses the verified Sessions Supabase project only. The repository now contains the secure Supabase bootstrap, email/phone OTP flow, device-backed session storage and canonical onboarding integration, but live Phase 4.5 certification remains blocked until that project is active and the deployed `/api/auth/config` can expose its real publishable configuration.

Never use or modify `church-os-dev` / `svhxjfearcuqxikzvlyb` for Sessions testing.

## Remaining non-fakeable gates

See `../../docs/PHASE-1-5-NATIVE-RED-TEAM-REPORT.md`. The unresolved gates are now deliberately narrow:

- restore/activate the verified Sessions Supabase project without modifying unrelated projects, then retrieve and verify its genuine publishable configuration and live identity schema;
- exact-commit iOS Simulator build, install, interaction and Maestro evidence;
- exact-commit Android Emulator build, install, interaction and Maestro evidence;
- review generated `ios/`, `android/` and native dependency lock changes;
- run the entire exact-head / merge-candidate / Chromium / release-gate chain again if machine execution changes the repository.

Room-specific equipment authority and canonical native room-media projection are no longer open architecture gaps.

## Cross-platform completion rule

Read `../../docs/PHASE-1-5-CROSS-PLATFORM-EXECUTION.md`. Every Phase 1–5 change must account for iOS, Android, PWA, desktop and shared core. A green Chromium/build result is necessary but does **not** replace exact native simulator/device evidence.
