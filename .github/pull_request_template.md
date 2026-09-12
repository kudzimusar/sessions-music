## Change summary

Describe the user/business behavior changed and the canonical data/authority boundary touched.

## Architecture checks

- [ ] No parallel customer/provider/booking/case source of truth was introduced.
- [ ] Organization hierarchy was not used as authorization.
- [ ] Provider access remains tenant-scoped.
- [ ] Corporate access remains deny-by-default and workforce-gated.
- [ ] Restricted/private data classification was reviewed for new fields, APIs and media.
- [ ] Mutations are authorized server-side and leave the required audit trail.
- [ ] Mobile critical workflows remain usable with 44px+ targets and safe-area handling.

## Database and migration checks

- [ ] Schema changes are additive or have an explicit migration/backout plan.
- [ ] Migration prefix is unique and ordered.
- [ ] New runtime schema is included in the verified Sites build artifact.
- [ ] No migration silently changes authority semantics or grants roles.

## Regression checks

- [ ] Negative authorization/lifecycle tests cover the change.
- [ ] Existing failures were fixed by aligning tests/implementation to the intended contract, not by weakening security.
- [ ] `npm run verify:release` passes locally or the reason it cannot be run locally is documented.

## Merge and release evidence

Do not mark this section complete from memory or from a previous commit.

- [ ] `verify exact PR head` passed for the current head SHA.
- [ ] `verify merge candidate` passed against the current base.
- [ ] `release-gate` passed.
- [ ] Review/documentation refers to this exact head SHA.
- [ ] Merge will use expected-head SHA protection.
- [ ] After merge, the immutable `main` SHA will be re-verified before UAT deployment.
- [ ] A ChatGPT Sites version will be saved from the reviewed `main` SHA before any wider publication.
