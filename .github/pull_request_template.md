## Change summary

Describe the user/business behavior changed and the canonical data/authority boundary touched.

## Product surface declaration

Select every surface changed by this PR. UI PRs without a declared surface are incomplete.

- [ ] `customer-native`
- [ ] `provider-native`
- [ ] `provider-web`
- [ ] `corporate-desktop`
- [ ] `corporate-critical-mobile`
- [ ] `shared-backend`

Before implementation/review, read `AGENTS.md`, `docs/UNIFIED-PLATFORM-IMPLEMENTATION-v1.md`, and `docs/PHASE-1-5-SURFACE-SEPARATION-AMENDMENT.md`.

## Surface architecture checks

- [ ] Customer/provider native-mobile work is designed from an app interaction model, not a narrowed desktop/PWA page.
- [ ] Native-mobile work does not mechanically stack desktop tables/cards or depend on desktop sidebars/hover.
- [ ] Desktop/PWA composition is used only where appropriate for web/provider/corporate workflows.
- [ ] Corporate is not exposed as a public customer/provider onboarding role choice.
- [ ] Corporate mobile work is an explicitly bounded critical subset rather than forced desktop parity.
- [ ] Owner/UAT Corporate access, if touched, remains attributable and authorization-correct; no global bypass/shared admin identity was introduced.

## Architecture checks

- [ ] No parallel customer/provider/booking/case source of truth was introduced.
- [ ] Organization hierarchy was not used as authorization.
- [ ] Provider access remains tenant-scoped.
- [ ] Corporate access remains deny-by-default and workforce-gated.
- [ ] Restricted/private data classification was reviewed for new fields, APIs and media.
- [ ] Mutations are authorized server-side and leave the required audit trail.
- [ ] Native/critical-mobile workflows use 44px+ targets and safe-area handling where applicable.

## Database and migration checks

- [ ] Schema changes are additive or have an explicit migration/backout plan.
- [ ] Migration prefix is unique and ordered.
- [ ] New runtime schema is included in the verified Sites build artifact.
- [ ] No migration silently changes authority semantics or grants roles.

## Regression checks

- [ ] Negative authorization/lifecycle tests cover the change.
- [ ] Existing failures were fixed by aligning tests/implementation to the intended contract, not by weakening security.
- [ ] `npm run verify:release` passes locally or the reason it cannot be run locally is documented.
- [ ] Visual/interaction UAT criteria are stated separately from automated build success for any UI change.

## Merge and release evidence

Do not mark this section complete from memory or from a previous commit.

- [ ] `verify exact PR head` passed for the current head SHA.
- [ ] `verify merge candidate` passed against the current base.
- [ ] `release-gate` passed.
- [ ] Review/documentation refers to this exact head SHA.
- [ ] Merge will use expected-head SHA protection.
- [ ] After merge, the immutable `main` SHA will be re-verified before UAT deployment.
- [ ] A ChatGPT Sites version will be saved from the reviewed `main` SHA before any wider publication.
