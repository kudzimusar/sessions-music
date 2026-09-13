# Phase 1–5 UI Alignment Correction v2

Status: SOURCE CORRECTION FOR VERSION 18 UAT FINDINGS
Date: 13 September 2026
Phase: 5 — Phase 6 not started
Visual revision: `phase1-5-native-desktop-v2`

This correction follows Version 18 hosted UAT. It does not change canonical booking, identity, provider, Corporate, D1, R2 or payment authority.

Implemented corrections:

- customer-native bottom navigation is part of the persistent app shell and remains available on detail/task routes;
- detail booking CTA is positioned above the persistent tab bar;
- customer native studio imagery reads actual canonical room media when supplied and otherwise uses a truthful branded fallback rather than generic service-based stock imagery;
- Profile explicitly represents the user's one Sessions identity and lists actually-authorized Personal, Provider and Corporate workspace contexts from the onboarding authority;
- customer native, provider native and desktop/PWA use the canonical Sessions mark from `public/favicon.svg`;
- private-hosted PWA manifest loading uses a credentialed manifest link while keeping protected routes protected;
- Version 18 UAT acceptance criteria now include both iOS and Android simulator review;
- provider-funded featured placement/promoted services are captured as a Phase 6 requirement only, with no fake Phase 5 payment or ranking controls.

The core rule is unchanged: native and desktop surfaces may differ in layout, styling, density, navigation, motion and interaction composition, but they must project the same canonical identity, workspace, studio, room, media, pricing, availability, booking, provider and security truth.
