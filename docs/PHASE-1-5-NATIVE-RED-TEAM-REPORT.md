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
- the original Sessions product brief, including music-specific discovery and AI search.

The binding interpretation remains: one Sessions platform, shared backend/domain truth, deliberately different native and desktop compositions.

## 2. Defects found and corrected

### Native runtime architecture

**Found:** the first native pass proved React Native but still used a hand-built monolithic navigation stack. This created unnecessary navigation, deep-link and continuation risk.

**Corrected:** Expo Router now owns the native route tree, stack navigation and customer bottom tabs. The obsolete manual `App.js` shell and its style layer were deleted rather than retained as an accidental alternative implementation.

### Expo configuration drift

**Found:** Expo Doctor rejected stale `newArchEnabled` and `android.edgeToEdgeEnabled` app-config keys under the current SDK schema.

**Corrected:** obsolete keys were removed. Edge-to-edge correctness is handled through the current runtime/platform behavior and safe-area/inset implementation rather than a stale config switch.

### Missing native peer dependency

**Found:** Expo Doctor detected that `expo-symbols` required `expo-font`; omitting it could fail outside Expo Go.

**Corrected:** SDK-matched `expo-font` is an explicit native dependency. Expo Doctor is a release gate rather than an advisory check.

### Release gate regression test

**Found:** CI had been strengthened to require the native Chromium projection, but an older test still asserted that release-gate depended on only exact-head and merge-candidate jobs.

**Corrected:** the regression test now requires exact-head, merge-candidate **and** native-Chromium success. The workflow was not weakened to satisfy the old assertion.

### Native AI regression

**Found:** Sessions already had a bounded AI planner on web, but the first native implementation did not expose it. This contradicted the product brief and created web/native capability drift.

**Corrected:** native now consumes the same `/api/planner` contract. There is no native-only model prompt and no second AI authority.

AI flow is:

`user brief -> explicit consent -> bounded structured interpretation -> editable requirements -> canonical Sessions matching -> user review`

AI cannot submit a booking.

### Equipment lost during AI interpretation

**Found:** the shared planner did not previously carry equipment requirements even though the canonical Sessions AI example includes constraints such as drums and PA. A request could therefore lose a core rehearsal requirement between natural-language interpretation and marketplace matching.

**Corrected:** equipment is now a first-class shared AI discovery field with a bounded canonical vocabulary. Native and web expose it as editable controls, the API extracts only allowed values, and canonical matching can reject studios whose published equipment does not satisfy the requested set.

Backward compatibility is preserved: older guided requests that omit `equipment` are interpreted as an empty required-equipment set.

### AI trust boundary

**Verified/hardened:** AI remains an intent interpreter only. It must not invent price, availability, verification, equipment availability, provider identity or booking confirmation. Account identity, precise location and booking history are not sent as part of the natural-language brief. AI mode requires explicit consent and a non-empty prompt. Server-side rate limiting and structured-output validation remain in force.

### Native authentication boundary

**Found:** a native client creates pressure to reuse browser audience state during UAT.

**Corrected:** browser cookies are deliberately omitted from native API requests. Secure device storage is isolated behind `expo-secure-store`, and the adapter fails closed while the genuine Sessions Supabase project is unidentified. The unrelated `church-os-dev` / `svhxjfearcuqxikzvlyb` project remains forbidden.

### Phase 4.5 surface gap

**Found:** the first native shell described the auth blocker but did not project enough of the Phase 4.5 product journey.

**Corrected:** native now contains the Sessions gateway, customer/provider intent separation, safe continuation handling, recovery semantics and device/session posture UI. Corporate remains absent from public self-selection.

The live production auth transaction remains intentionally blocked until the real Sessions Supabase environment is positively identified.

### Phase 5 corporate mobile gap

**Found:** the first native pass did not represent the approved `corporate-critical-mobile` subset.

**Corrected:** an isolated demo-only critical-mobile surface now covers urgent queue, summary, acknowledgement, assignment, next action, concise note and escalation patterns. It cannot write production state or masquerade as full Corporate authority.

### Booking inventory quality

**Found:** the first booking screen looked too much like a generic row of appointment times.

**Corrected:** availability and unavailability are explicit states, duration and room fit are visible, and review is separated from the eventual authenticated mutation. Server quote/inventory remain authoritative.

### Discovery information density

**Found:** initial native results were too shallow and forced extra taps to understand fit.

**Corrected:** UAT projections now carry capacity, equipment, backup power, verification, rating, next availability and booking references so the mobile information hierarchy can be evaluated properly.

### Offline/error/accessibility behavior

**Found:** network failure and field accessibility needed native-specific treatment.

**Corrected:** the native UI has explicit offline/loading/empty/error primitives, safe areas, platform touch targets and haptics. Shared `Field` now binds every visual field label to the native accessibility name by default so VoiceOver, TalkBack and the Chromium accessibility tree receive the same semantics.

## 3. Competitive and platform review

This review studied current public patterns for direction, not cloning.

### PIRATE

Sources:

- https://www.pirate.com/
- https://support.pirate.com/hc/en-gb/articles/4437531744785-New-to-PIRATE-COM
- https://www.pirate.com/en/rehearsal-studios/

Useful patterns:

- live booking calendar is the product, not a decorative calendar;
- equipment is explicit and practical;
- access/check-in information is part of booking value;
- extend and rebook are first-class repeat actions;
- music-room categories communicate fit quickly.

Sessions response: availability, equipment truth, booking reference, rebook/repeat and check-in-oriented booking detail remain first-class mobile concepts.

### Peerspace

Source:

- https://support.peerspace.com/en/articles/10119108-how-do-i-find-the-right-space-for-my-booking

Useful patterns:

- price, attendee count, instant booking and feature filters;
- list/map discovery;
- rules, pricing, amenities and reviews visible before commitment;
- saving/sharing candidate spaces.

Sessions response: result cards should expose music-specific fit before opening a listing. Map/favourites remain valid later discovery work but must not destabilize Phase 1–5 or pull Phase 8 wholesale into this branch.

### Tagvenue

Sources:

- https://www.tagvenue.com/
- https://www.tagvenue.com/blog/what-is-tagvenue/

Useful patterns:

- rich practical filtering;
- pricing and response signals upfront;
- verified reviews;
- favourites/shortlists for comparison.

Sessions response: music-specific constraints are more important than generic venue filter volume. The benchmark is not “more filters”; it is fewer irrelevant results with clearer evidence of fit.

### Calendly

Sources:

- https://calendly.com/help/calendly-mobile-app-overview
- https://calendly.com/help/mobile-app-faq

Useful patterns:

- bottom navigation around a small set of daily mobile jobs;
- mobile handles scheduling and quick changes;
- selected account/admin complexity remains web-only;
- reminders and push notifications support time-sensitive workflows.

Sessions response: provider-native stays bounded to daily operations rather than becoming a compressed provider desktop. Push/device notification integration is a native device-integration item and must use real consent/session infrastructure rather than a fake Phase 1–5 demo channel.

### Apple iOS/iPadOS guidance

Sources:

- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/accessibility

Useful patterns:

- tab bars are for stable top-level navigation, not actions;
- labels should remain visible and concise;
- mobile controls need comfortable minimum sizes;
- tab state should remain predictable.

Sessions response: customer-native uses four stable labeled tabs; task actions remain inside screens/tool areas rather than becoming navigation items.

### Android guidance

Sources:

- https://developer.android.com/develop/ui/views/layout/edge-to-edge
- https://developer.android.com/guide/topics/ui/accessibility/apps

Useful patterns:

- modern Android is edge-to-edge and must explicitly respect system insets;
- tappable controls should have at least a 48dp focus/touch area;
- gesture/system bars must not obscure primary actions.

Sessions response: safe-area handling and Android touch-target contracts are release requirements, not visual polish.

## 4. Chromium / Playwright acceptance layer

Chromium is used only as an additional verification projection of the same Expo Router source. It is **not** evidence that the iOS/Android binaries are WebViews, and it does not replace simulator certification.

The Playwright gate covers three compact phone profiles:

- 390 × 844 iOS-like viewport;
- 412 × 915 Android-like viewport;
- 320 × 568 small-phone stress viewport.

Checks include:

- runtime/page-console failures;
- horizontal overflow;
- no iframe/WebView-style application shell;
- customer bottom-navigation presence;
- AI visibility, consent and non-booking authority;
- editable equipment constraints;
- music-specific search controls;
- public onboarding without Corporate self-selection;
- explicit available/unavailable inventory;
- practical primary-CTA height;
- bounded provider mobile scope;
- isolated Corporate critical-mobile demo;
- rebook/repeat/share session actions.

CI also requires Expo Doctor and Expo Router web export before Playwright is allowed to run.

## 5. Remaining blockers and non-fakeable gaps

These items must remain visible; a green source/Chromium build must not relabel them as complete.

### Exact iOS and Android runtime certification

Still required on a Mac with Xcode and an Android SDK/emulator:

- generate the native projects;
- compile/install `Sessions UAT` on both platforms;
- verify safe areas, system bars, keyboard and hardware/system navigation behavior;
- verify platform identity and backend release provenance from the installed runtimes;
- capture exact-commit screenshots/logs.

### Production native authentication

Still blocked until the genuine Sessions Supabase project is positively identified and configured. No browser-cookie workaround is acceptable.

### Room-level equipment authority

**Open data-model hardening item.** The current production registry has a studio-level equipment field while the product brief ultimately expects room-level equipment inventories. AI can now preserve and enforce equipment requirements against published Sessions equipment data, but Sessions must not claim exact room-specific gear where the provider has not supplied room-level truth. Before production certification of heterogeneous multi-room gear matching, provider room equipment needs an authoritative canonical representation.

### Canonical photography

The native UAT client still uses a deliberate non-authoritative visual placeholder when no canonical room media is available. That is not the final marketplace visual benchmark. Production cards/details should project authorized provider room media from Sessions storage; scraped competitor imagery must never be used as filler.

### Native push/device notification integration

Time-sensitive booking notifications are strategically useful and benchmark well against mature scheduling apps, but real push registration is a device/auth/consent capability. It should be integrated only against legitimate Sessions identity and notification authority, not simulated as a production feature in this phase.

## 6. Merge rule

PR #22 remains draft and unmerged until the **final exact head** has:

1. exact-head CI green;
2. merge-candidate CI green;
3. shipped native dependency audit green;
4. Expo Doctor green;
5. Expo Router export green;
6. Chromium/Playwright green;
7. release-gate green;
8. exact-commit iOS simulator certification;
9. exact-commit Android emulator certification;
10. no auth bypass and no WebView/PWA substitution.

A later commit invalidates earlier exact-commit certification and must be retested.
