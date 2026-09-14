# Sessions Phase 1–5 Native Red-Team Review

**Status:** implementation hardening record  
**Review date:** 14 September 2026  
**Target:** iOS native, Android native, PWA/mobile web, desktop/web and the shared Sessions product core  
**Boundary:** Phase 1–5 only. This review does not authorize Phase 6.

## 1. Governing plans reviewed

This pass was checked against the current Sessions implementation authority, especially:

- `UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`;
- `PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`;
- `PHASE-1-5-CROSS-PHASE-REVIEW.md`;
- `PHASE-4-5-AND-5-IMPLEMENTATION.md`;
- `AUTHORITY-AND-UNIFICATION.md`;
- the Sessions Phase 1–5 cross-platform execution rule;
- the original Sessions product brief, including music-specific discovery and AI search.

The binding interpretation remains: one Sessions platform, shared backend/domain truth, deliberately different native and desktop compositions.

## 2. Defects found and corrected

### Native runtime architecture

**Found:** the first native pass proved React Native but still used a hand-built monolithic navigation stack.

**Corrected:** Expo Router now owns the native route tree, stack navigation and customer bottom tabs. The obsolete manual `App.js` shell and its style layer were deleted rather than retained as an accidental alternative implementation.

### Expo configuration and dependency drift

**Found:** Expo Doctor rejected obsolete config keys and later found a missing `expo-font` peer required by `expo-symbols`.

**Corrected:** obsolete config was removed, SDK-matched dependencies are pinned, modern safe-area handling uses `react-native-safe-area-context`, and Expo Doctor is a release gate rather than an advisory check.

### Native AI regression

**Found:** Sessions already had a bounded AI planner on web, but the first native implementation did not expose it.

**Corrected:** native consumes the same `/api/planner` contract. There is no native-only model prompt and no second AI authority.

AI flow is:

`user brief -> explicit consent -> bounded structured interpretation -> editable requirements -> canonical Sessions matching -> user review`

AI cannot submit a booking.

### Equipment lost during AI interpretation

**Found:** the shared planner did not carry equipment requirements even though Sessions examples include drums and PA.

**Corrected:** equipment is now a first-class shared AI discovery field with a bounded canonical vocabulary. Native and web expose it as editable controls, the API extracts only allowed values, and canonical matching checks equipment before returning a fit.

### Room-level equipment authority

**Found:** the legacy registry stored studio-wide free-text equipment, which could falsely imply every room contained the same gear.

**Corrected:** `StudioRoom` now owns a structured `equipment[]` list in the canonical room aggregate. The provider room editor exposes the same bounded vocabulary, the registry API validates/persists it and rejects duplicates, `asRoom()` projects it, and the canonical planner checks the selected room rather than the studio-wide text.

**Fail-closed rule:** when equipment is required and the room has no confirmed room-specific list, the planner returns no equipment-qualified match. Studio-wide free text remains legacy/display metadata only.

### AI trust boundary

**Verified/hardened:** AI remains an intent interpreter only. It must not invent price, availability, verification, equipment availability, provider identity or booking confirmation. Account identity, precise location and booking history are not sent as part of the natural-language brief. AI mode requires explicit consent and a non-empty prompt. Server-side rate limiting and structured-output validation remain in force.

### Genuine Sessions Supabase identity authority

**Found:** the first native pass correctly refused to guess a Supabase environment, but later documentation continued to say the Sessions project was unidentified.

**Resolved:** the genuine project is positively identified as:

- project name: `Sessions`;
- project ref: `meswozsllmmiqjwljvnb`;
- project URL: `https://meswozsllmmiqjwljvnb.supabase.co`;
- region observed at discovery: `eu-central-1`.

The unrelated `church-os-dev` / `svhxjfearcuqxikzvlyb` project remains forbidden.

**Current external blocker:** Sessions is inactive. A restore attempt was rejected because the Supabase organization has reached its active free-project capacity. The control-plane connector subsequently stopped providing a safe live database path. No unrelated project was paused or modified, no publishable key was invented, and no identity migration was applied blindly.

### Native authentication implementation

**Found:** the first native shell described the auth boundary but did not contain a real production-native authentication transaction.

**Corrected repository-side:** native now includes:

- exact Sessions project URL/ref validation;
- hard rejection of the forbidden project;
- Supabase JS native client initialization;
- encrypted `expo-secure-store` persistent auth storage;
- automatic token refresh tied to native app foreground/background state;
- browser UAT storage that fails closed and cannot persist native credentials;
- real email/phone OTP request and six-digit verification;
- safe internal continuation handling;
- local native sign-out;
- real gateway routing into the phone/email sign-in screen.

Live Phase 4.5 certification remains pending until the verified project is active and `/api/auth/config` can expose its genuine publishable configuration.

### Native onboarding canonicalization

**Found:** the native onboarding wizard was originally a presentation-only preview and could have become a second profile/consent model.

**Corrected:** after a verified native Supabase session, native now writes through the existing canonical `/api/onboarding` contract:

- `completeProfile`;
- versioned Terms consent;
- versioned Privacy consent;
- provider intention when selected.

Corporate remains absent from public self-selection. Android/iOS/web projection attribution is explicit and platform-correct. A redirect bug that would have sanitized `/onboarding?resume=profile` to `/home` after OTP was found during self-review and fixed by adding onboarding to the safe continuation allowlist.

### Canonical photography / media projection

**Found:** native marketplace cards used a deliberate monogram placeholder even though Sessions already has room-scoped canonical media in D1/R2.

**Corrected:** no new media database was created. Native cards now render only trusted same-origin `/api/media/<uuid>` room/studio media when available. Arbitrary remote images are rejected. If provider media is absent, the app uses a neutral Sessions-branded fallback rather than scraped, stock or AI-generated room imagery.

### Phase 4.5 surface gap

**Corrected:** native contains gateway, OTP sign-in, customer/provider intention, canonical onboarding, safe continuation, recovery/device-session posture and secure session storage. Corporate remains invitation/authorization-only.

### Phase 5 corporate mobile gap

**Found:** the first native pass did not represent the approved `corporate-critical-mobile` subset.

**Corrected:** an isolated demo-only critical-mobile surface covers urgent queue, summary, acknowledgement, assignment, next action, concise note and escalation patterns. It cannot write production state or masquerade as full Corporate authority.

### Booking inventory quality

**Found:** the first booking screen looked too much like a generic row of appointment times.

**Corrected:** availability/unavailability are explicit, duration and room fit are visible, and review is separated from the eventual authenticated mutation. Server quote/inventory remain authoritative.

### Discovery information density

**Found:** initial native results were too shallow and forced extra taps to understand fit.

**Corrected:** native projections carry capacity, equipment, backup power, verification, rating, next availability and booking references so the information hierarchy can be evaluated before opening a listing.

### Offline/error/accessibility behavior

**Corrected:** native UI has explicit offline/loading/empty/error primitives, safe areas, platform touch targets and haptics. Visual labels are bound to native accessibility names by default, and planner checkboxes expose checked state to native and browser accessibility trees.

## 3. Competitive and platform review

The review used current public patterns for direction, not cloning.

### PIRATE

Useful patterns: live availability as the core booking surface, practical equipment truth, access/check-in information and repeat/rebook actions.

Sessions response: availability, room equipment truth, booking reference, rebook/repeat and check-in-oriented detail stay first-class mobile concepts.

### Peerspace

Useful patterns: price/attendee/features before commitment, strong photography, list/map discovery and practical rules.

Sessions response: music-specific fit should be obvious before a listing opens. Provider-authorized room media is used when canonical; invented imagery is never acceptable.

### Tagvenue

Useful patterns: practical filtering, price/response signals, reviews and shortlisting.

Sessions response: the benchmark is not maximum filter count; it is fewer irrelevant spaces with stronger evidence of musical fit.

### Calendly

Useful patterns: mobile focuses on daily scheduling actions while heavier configuration remains web-oriented.

Sessions response: provider-native remains bounded to today/requests/rooms/urgent actions; pricing setup, staff administration, reporting and long-range management remain desktop/PWA where appropriate.

### Apple / Android guidance

Sessions follows stable labeled native tabs, native stack navigation, safe-area/system-inset handling, comfortable touch targets, accessible control state and platform-consistent back/keyboard behavior. These are release requirements, not cosmetic polish.

## 4. Browser and installed-native acceptance layers

### Chromium / Playwright

Chromium is an additional verification projection of the same Expo Router source. It is not installed-native certification.

The Playwright gate covers:

- 390 × 844;
- 412 × 915;
- 320 × 568.

It checks runtime/console failures, overflow, accessibility, touch targets, AI consent/equipment controls, booking inventory states, provider-mobile bounds, public Corporate exclusion and critical-mobile isolation.

### Installed iOS / Android Maestro

A separate `.maestro` suite is now committed for the real installed `Sessions UAT` app (`com.sessionstech.sessions.uat`):

- `phase1-5-smoke.yml` — gateway, native sign-in, native back, customer tabs and AI entry;
- `native-diagnostics.yml` — installed-runtime release provenance and anonymous 401/403 security probe;
- `phase5-operations.yml` — studio → inventory → booking review and provider daily operations.

These flows must run against the built `.app` and `.apk`/installed emulator app. They cannot be replaced by Playwright.

## 5. Remaining blockers and non-fakeable gaps

Only the following remain open after repository hardening.

### Activate the verified Sessions Supabase project

The project is identified but inactive. The organization must have capacity for it to become active. Once active:

1. retrieve the genuine publishable key/configuration;
2. inspect live migrations/tables and compare against repository identity migrations;
3. apply only missing identity migrations;
4. run Supabase security/performance advisors;
5. expose the verified runtime config through `/api/auth/config`;
6. exercise native OTP/session/recovery against the real project.

Do not move studio/room/booking/media truth into Supabase.

### Exact iOS and Android runtime certification

Still required on a Mac with Xcode and Android SDK/emulator:

- generate and review `ios/` and `android/` projects plus final native lockfile;
- compile/install `Sessions UAT` on both platforms;
- run all three Maestro flows on iOS and Android;
- verify safe areas, system bars, keyboard and hardware/system navigation behavior;
- verify platform identity and backend release provenance from installed runtimes;
- capture exact-commit screenshots/logs.

### Native push/device notification integration

Push is useful but remains a genuine device/auth/consent capability. It must be implemented only against legitimate Sessions identity and notification authority; it must not be simulated as production functionality to close Phase 1–5 prematurely.

## 6. Merge rule

PR #22 remains draft and unmerged until the **final exact head** has:

1. exact-head CI green;
2. merge-candidate CI green;
3. shipped native dependency audit green;
4. Expo Doctor green;
5. Expo Router export green;
6. Chromium/Playwright green;
7. release-gate green;
8. exact-commit iOS simulator certification including Maestro;
9. exact-commit Android emulator certification including Maestro;
10. no auth bypass and no WebView/PWA substitution.

A later commit invalidates earlier exact-commit certification and must be retested.
