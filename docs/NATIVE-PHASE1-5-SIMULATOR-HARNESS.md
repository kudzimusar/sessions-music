# Phase 1–5 Native Simulator Harness

Status: CONFIGURATION STARTED
Scope: customer-native and provider-native verification only; no Phase 6 implementation
Reference hosted build: ChatGPT Sites Version 20
Reference commit: `be4279bfbdd69f790cce6d7787e0132b27d67e68`
Reference release revision: `phase1-5-surface-consolidated-v20`

## Purpose

The `/mobile/...` implementation on ChatGPT Sites is the approved interaction reference, not the final native runtime. Xcode Simulator and Android Emulator must execute an actual iOS/Android application binary.

This harness introduces that runtime early for Phase 1–5 verification without redefining Phase 10. Phase 10 remains the production native runtime/device-integration migration milestone. The present harness exists to prevent native interaction defects from being deferred until that milestone.

## Technology decision

Use Expo SDK 57 / React Native 0.86 for the shared native test runtime.

Reasons:

- produces real iOS and Android native projects and binaries;
- `expo prebuild` generates Xcode and Gradle projects that can be opened directly in Xcode and Android Studio;
- React Native renders native views rather than wrapping the Sessions PWA in a WebView;
- one TypeScript/JavaScript interaction implementation can be validated on both platforms while platform-native differences remain observable;
- Expo configuration can continuously regenerate native project settings rather than requiring duplicated manual Xcode/Gradle configuration.

A WebView wrapper, Capacitor wrapper, or simple simulator browser shortcut is not an acceptable substitute for this harness.

## Configuration stages

### Stage N0 — native runtime boot

Required on both iOS and Android:

- generate native projects;
- compile debug binary;
- install to simulator/emulator;
- confirm platform identity;
- confirm Sessions UAT package identity;
- connect to Version 20 `/api/release`;
- confirm Phase 5 / `phase1-5-surface-consolidated-v20` provenance;
- confirm protected APIs remain fail-closed.

### Stage N1 — Phase 1 visual/navigation migration

Move the approved customer-native shell into the native runtime:

- canonical Sessions mark;
- Black / Royal Blue / White tokens;
- safe-area-aware app chrome;
- persistent customer bottom tabs;
- native Search -> Studio -> Booking navigation stack;
- native loading/empty/error/offline states;
- no WebView and no responsive desktop composition.

Accept only after the same route/screen path is visually checked in both iOS and Android simulators.

### Stage N2 — Phase 2/3 context and authority projections

Validate UI projection of canonical workspace and authority contracts:

- one human identity;
- Personal / Provider / Corporate are authorized contexts, not separate accounts;
- provider authority is organization scoped;
- Corporate is never publicly self-selected;
- Corporate mobile remains a bounded critical-action subset;
- UI state alone never creates authority.

Until production native authentication is available, fixture/contract data used here is visual-test-only and must never be represented as production authorization.

### Stage N3 — Phase 4 corporate/mobile boundary

Corporate remains desktop/tablet-first. Native mobile testing is limited to deliberately chosen critical actions. Do not port the full Corporate control plane into the phone harness.

### Stage N4 — Phase 4.5 native identity/session integration

Production target is Supabase Auth. Required before certification:

- verify the identified Sessions Music Supabase project and its applied migrations;
- confirm the approved identity migrations are applied;
- configure native redirect schemes/associated links;
- enable only tested phone/email/OAuth providers;
- preserve device/session/MFA/AAL state;
- store tokens only in native secure storage;
- exchange/validate native identity server-side;
- preserve protected deep-link continuation.

The current ChatGPT Sites `/welcome` audience session is not a native authentication API and must not be copied into the native app as a cookie/WebView workaround.

### Stage N5 — Phase 5 booking/customer/provider verification

After native auth is legitimate:

- search/discovery reads canonical backend state;
- studio media/facts/rates/availability match desktop/PWA;
- booking quote is server-owned;
- booking mutation uses existing authorization/state-machine paths;
- Sessions/history reflects the same booking records;
- provider Requests actions preserve tenant authorization;
- restricted media remains protected;
- no mobile-only booking store or pricing logic is introduced.

## Phase 1–5 test result taxonomy

Each item must be recorded as one of:

- PASS — verified in both native runtimes against the intended authority/data source;
- PASS-VISUAL — verified natively using contract/fixture data, but not integration-certified;
- BLOCKED-IDENTITY — requires the real Sessions Supabase environment;
- FAIL — implementation defect;
- NOT-APPLICABLE — intentionally desktop-only or outside Phase 1–5.

This prevents simulator appearance from being mistaken for backend/security certification.

## Current status

Sessions Music is identified and its identity migrations are applied. `church-os-dev` (`svhxjfearcuqxikzvlyb`) is unrelated and must never be used for Sessions testing.

The remaining gates are provider/runtime configuration, live OTP/OAuth delivery tests, and installed iOS/Android certification. Native identity authority must remain server-derived and fail closed until those gates pass.
