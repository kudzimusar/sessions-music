# Phase 1 Review — Production Design System and Navigation

Status: HARDENING GATE
Review date: 11 September 2026
Branch: `implementation/unified-platform-v1`

This review was performed before allowing the Sessions unified-platform programme to progress further. Phase 1 is not considered complete merely because the initial token file exists; the production boundary must prevent the legacy deep-blue/slate palette from leaking into rendered production surfaces.

## Reviewed scope

- Root layout and viewport/theme metadata.
- Global, registry, shared polish and rebuilt customer stylesheets.
- Final production brand override order.
- Customer, provider/registry and corporate visual surfaces.
- Corporate desktop/mobile responsive boundary.
- Keyboard focus, reduced-motion and forced-colour behavior.
- PWA manifest and favicon.
- Service worker for visual/install side effects.
- Generic Open Graph/social-image references.
- Regression tests and production build.

## Findings and corrections

### 1. Legacy palette leakage

Finding: the initial `brand-v1.css` had the correct Black / Royal Blue / White tokens, but older production stylesheets still contain hard-coded legacy deep-blue/slate values. Loading the brand layer last did not by itself guarantee every rendered selector was remapped.

Correction:

- Established `body[data-sessions-brand='v1']` as the explicit production brand boundary.
- Increased final-layer specificity instead of relying on incidental source order alone.
- Remapped registry custom properties to the approved production tokens.
- Replaced decorative legacy tints in the final production layer with neutral black/white derivatives or Royal Blue derivatives.
- Kept green/amber/red only for semantic status states.

The older stylesheets remain during the controlled migration, but they are no longer the authoritative production presentation layer.

### 2. Corporate responsive coverage

Finding: the first corporate responsive rules only applied where `data-sessions-surface='corporate'` happened to be present. Not every corporate route had that boundary.

Correction:

- Wrapped every `/corporate/*` route and `/registry-admin` in the corporate surface boundary.
- Added mobile one-column fallbacks for dense corporate grids.
- Added horizontal scrolling for tables instead of forcing layout overflow.
- Preserved a 44px minimum touch target for critical controls.
- Added practical mobile textarea sizing.

### 3. Accessibility hardening

Correction:

- Royal Blue 3px focus treatment for keyboard navigation.
- Reduced-motion mode now suppresses animation and transition duration in addition to smooth scrolling.
- Forced-colour mode uses the operating-system highlight colour for focus indication.
- Form controls inherit the production token boundary and native checkbox/radio accents use Royal Blue.

### 4. Installed-app identity

Finding: the PWA manifest and favicon still used the previous deep-blue/light-grey palette after the first Phase 1 implementation.

Correction:

- Manifest background: `#FFFFFF`.
- Manifest theme: `#4169E1`.
- Favicon: Royal Blue `#4169E1` with White `#FFFFFF` mark.
- Regression coverage now checks these values.

### 5. Generic social image

Finding: root metadata referenced `public/og.png`, a binary asset that could not be visually certified through the available repository interface during this gate.

Correction:

- Removed the generic `og.png` reference from root Open Graph and Twitter metadata.
- Deleted the unverified binary asset from this implementation branch.
- Studio pages continue their existing behavior of not inheriting generic studio imagery.

A future social card must be introduced as an explicitly reviewed Black / Royal Blue / White asset rather than inheriting an unverified legacy file.

### 6. Service worker

Review: `public/sw.js` only manages authenticated offline booking-reference caching. It contains no theme colours, install splash presentation, or visual asset cache that can reintroduce the legacy brand.

## Regression requirements

Phase 1 remains guarded by tests that assert:

- the final brand stylesheet loads last;
- the root body carries the production brand marker;
- the browser theme is Royal Blue;
- the authoritative brand layer contains the approved Black / Royal Blue / White tokens;
- known legacy production palette values do not enter the authoritative brand layer;
- the registry palette is remapped at the final production boundary;
- PWA manifest and favicon match the approved brand;
- unreviewed generic `/og.png` metadata is not advertised;
- corporate tables and layouts remain usable on mobile;
- keyboard focus, reduced motion and forced colours are supported.

## Completion rule

Phase 1 can be marked complete only after the production build and full automated test suite pass on the final hardening commit. Browser-level visual QA on the deployed ChatGPT Sites origin remains a release/UAT verification step because this execution environment cannot interactively inspect that hosted UI.
