# Sessions Native UAT Runtime

This directory is the native simulator harness for Phase 1–5 verification. It is **not** the desktop/PWA and does not embed the hosted site in a WebView.

## Runtime baseline

- Expo SDK 57
- React Native 0.86.3
- React 19.2.3
- Node.js 22.13+
- iOS simulator target supported by Expo SDK 57: iOS 16.4+
- Android emulator target supported by Expo SDK 57: Android 7+; compile/target SDK 36
- UAT backend: `https://sessions-music.kudzimusar.chatgpt.site`
- Expected Sessions release: `unified-platform-v1-phase5`
- Expected visual revision: `phase1-5-native-desktop-v2`

The package identifiers are intentionally UAT-only for now:

- iOS bundle ID: `com.sessionstech.sessions.uat`
- Android application ID: `com.sessionstech.sessions.uat`
- URL scheme: `sessions-uat`

Do not use these as final App Store / Play Store identifiers without explicit approval.

## Generate the actual Xcode and Android Studio projects

From this directory:

```bash
npm install
npm run doctor
npm run prebuild
```

`npm run prebuild` generates real `ios/` and `android/` native projects from `app.json`.

### iOS

```bash
npm run ios
```

This generates/builds the Xcode project if needed and installs the app into an available iOS simulator. You can then open the generated `ios/` workspace/project in Xcode for native debugging.

### Android

```bash
npm run android
```

This generates/builds the Gradle project if needed and installs the app into an available Android emulator. You can then open the generated `android/` directory in Android Studio for native debugging.

## First acceptance checkpoint

Before moving Phase 1–5 screens into this runtime, both platforms must prove all of the following:

1. The simulator/emulator installs a binary named **Sessions UAT**.
2. The screen identifies the actual runtime as `ios` or `android`.
3. The app is visibly React Native UI and contains no WebView/PWA shell.
4. `GET /api/release` succeeds against the Version 19 UAT backend.
5. The returned release is Phase 5 with visual revision `phase1-5-native-desktop-v2`.
6. A protected hosted endpoint remains protected; native test setup must not introduce an auth bypass.

## Authentication limitation

The current private ChatGPT Sites `/welcome` session is a browser/hosting audience gate, not a native production authentication protocol. The approved platform architecture requires Supabase Auth to be authoritative for native production identities, factors and sessions.

The real Sessions Supabase project has not yet been positively identified. Therefore:

- Phase 1 native visual/navigation runtime can be tested immediately.
- Connectivity and anonymous/fail-closed API behavior can be tested immediately.
- Phase 2–4 native projections can be exercised with non-authoritative fixture/contract data where necessary for UI validation.
- Full signed-in Phase 4.5 identity/device/MFA/session integration cannot be certified until the correct Sessions Supabase environment exists.
- Full authenticated Phase 5 booking mutations cannot be certified through a fake simulator identity or hard-coded bypass.

This boundary must remain explicit in UAT results.
