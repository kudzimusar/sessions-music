# Phase 1–5 Cross-Platform UAT

This runbook is the Phase 1–5 exit gate for Sessions. Phase 6 must not start, and PR #22 must not merge, until the applicable gates below are evidenced at one exact source revision.

## Product rule: one product, four clients

Sessions shares brand, canonical data, authorization rules, workflows and release provenance across clients. Interaction is intentionally platform-native rather than pixel-identical.

| Client | UAT interaction authority |
| --- | --- |
| iOS native | Native iOS ergonomics: safe areas, tab/navigation semantics, sheets/modal behavior, gestures/back behavior, keyboard handling, iOS touch targets and system chrome. Installed app must be a real Expo/React Native binary, not a WebView/PWA shell. Certification toolchain is Xcode 27.0 with an iOS 27 simulator. |
| Android native | Android/Material semantics: Android system back, system bars, keyboard behavior, 48dp-class touch targets, Android navigation conventions. Do not imitate iOS interaction. Installed app must be a real Expo/React Native binary, not a WebView/PWA shell. |
| PWA / mobile browser | Browser-appropriate responsive UI, installability where supported, online/offline/network behavior, browser keyboard/focus behavior and touch ergonomics. Do not imitate a native app shell. |
| Desktop web | Responsive desktop layout, pointer/hover states, visible focus, keyboard navigation, appropriate density and desktop information hierarchy. Do not stretch the mobile UI into a desktop viewport. |

## Shared authority invariants

Every client must preserve these product invariants:

- Supabase project `ennfiyxlkvlmtkmibltz` is the production identity/authorization authority.
- Supabase owns identity, organizations, memberships, global/scoped roles, verified contacts, device sessions and identity audit only.
- D1 remains the marketplace/operations system of record for studios, rooms, room equipment, availability, bookings, quotes/pricing, settlements and provider operations.
- R2 remains canonical media/restricted-evidence storage.
- Studios, bookings, pricing and media must not be duplicated into Supabase.
- ChatGPT Sites audience cookies are not native identity and must never be imported into native auth.
- Native authenticated requests use a Supabase bearer token from the native secure session boundary and deliberately omit browser cookies.
- AI interprets intent only. Canonical Sessions data decides equipment, price, availability and booking authority.
- Privileged and booking mutations fail closed without a genuine authenticated native/web identity.
- `/api/release` provenance must match the Phase 1–5 release contract.
- Anonymous access to protected corporate authority endpoints must return 401/403, never 200.

## Database entry gate

Before a UAT run is accepted:

1. The checked-in Supabase identity migrations replay successfully from zero.
2. The target deployed application points at the verified Sessions Music Supabase project.
3. D1 and R2 remain the authoritative marketplace/media bindings.
4. No UAT fixture is allowed to create production authorization or replace canonical server validation.
5. Real OTP/OAuth actions are only accepted when the corresponding provider/delivery configuration is enabled and independently verified.

A green zero-state database replay proves repository schema reproducibility; it does not by itself prove a migration has been applied to the live hosted project or that delivery providers are configured.

## Shared Phase 1–5 UAT cases

All four clients must cover, where the capability exists:

1. **Release provenance** — verify the deployed `/api/release` response matches the exact Phase 1–5 release contract.
2. **Identity boundary** — show the verified Supabase project and prove no browser-cookie/native-session crossover.
3. **Protected authority** — anonymous corporate/security probe returns 401/403.
4. **Discovery** — studio/room discovery renders canonical constraints without invented inventory.
5. **Room equipment** — equipment filtering is room-specific and bounded by the shared registry contract; legacy studio prose must not satisfy an equipment requirement.
6. **Planner** — guided/AI requirements remain editable and canonical Sessions data controls the result.
7. **Booking review** — selected room/date/start/duration/capacity/price are canonical and revalidated server-side before mutation.
8. **Provider context** — provider operations expose only the intended mobile subset; desktop-only administration remains on PWA/desktop by design.
9. **Failure modes** — offline/network/auth failures are explicit, recoverable and fail closed.
10. **Accessibility/interaction** — controls are discoverable through platform semantics, keyboard/back/focus behavior is correct, and no critical action relies only on visual styling.

## Native installed-app gates

### iOS

Required evidence:

- Xcode version is exactly 27.0.
- iOS 27 simulator boots and is recorded.
- Expo Doctor passes.
- Release configuration builds successfully.
- `com.sessionstech.sessions.uat` installs and launches without crash.
- Native gateway, sign-in architecture, customer tabs, planner, diagnostics and Phase 5 operational flow execute in Maestro.
- Safe areas, tab behavior, modal/sheet behavior, keyboard behavior and back/gesture navigation are usable.
- No WebView/PWA-shell implementation exists in shipped app code.
- Crash reports, simulator logs, Maestro diagnostics and screenshot evidence are retained when a run fails.

### Android

Required evidence:

- Android emulator boots and is recorded.
- Expo Doctor passes.
- Release APK builds and installs.
- `com.sessionstech.sessions.uat` launches without crash.
- Native gateway, sign-in architecture, customer tabs, planner, diagnostics and Phase 5 operational flow execute in Maestro.
- Android system back, system bars, keyboard behavior and touch targets are usable.
- No WebView/PWA-shell implementation exists in shipped app code.
- logcat, Maestro diagnostics and screenshot evidence are retained when a run fails.

## PWA / mobile-browser gates

The PWA/mobile-browser gate is separate from installed-native certification. It must verify the real browser client and deployed backend, including:

- responsive mobile-browser layout;
- browser navigation/back behavior;
- keyboard and focus behavior;
- online/offline/network-state handling;
- installability/service-worker behavior where the product exposes it;
- identity and protected-endpoint behavior against the active backend;
- canonical discovery/planner/booking read flows;
- no native-shell imitation used as a substitute for browser ergonomics.

The Expo Router Chromium projection is useful regression evidence, but it is not by itself proof of the main deployed PWA.

## Desktop web gates

Desktop UAT must use a desktop viewport and the deployed web product. It must verify:

- responsive desktop information hierarchy rather than a stretched phone layout;
- pointer/hover affordances where relevant;
- visible focus and keyboard traversal;
- dialogs, tables/forms, navigation and provider/corporate surfaces at desktop density;
- active-backend identity/protected-endpoint behavior;
- canonical D1/R2 marketplace/media behavior;
- no regression in Phase 1–5 customer/provider/corporate workflows.

## Phase 1–5 exit decision

Phase 1–5 can be declared UAT-complete only when one exact candidate revision has:

- green exact-head and merge-candidate CI;
- green zero-state Supabase replay;
- green installed Android Release UAT;
- green installed iOS Release UAT under Xcode 27.0;
- green PWA/mobile-browser UAT against the deployed product;
- green desktop UAT against the deployed product;
- evidence that enabled production auth providers work end to end for the flows being certified;
- no unresolved critical/high-severity authorization, data-authority, crash, navigation or booking-integrity defect.

Until then, Phase 6 stays closed and PR #22 remains unmerged.
