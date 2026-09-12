# Sessions release gate process

This document defines the release boundary for Sessions. A feature being present in source is not the same as a release being reviewable, merged or deployed.

## Current release target

The current source release target is:

- release id: `unified-platform-v1-phase5`
- phase: `5`
- phase status: `complete`
- canonical Sites project: `appgprj_6a9530e0c2548191b905ccc3a663dc4d`
- D1 binding: `DB`
- R2 binding: `BUCKET`

A private UAT Site built for Phase 4.5/5 must report this Phase 5 provenance from `/api/release`. A stale Phase 4 marker is a failed release gate.

## Invariants

1. **The PR head is immutable evidence.** CI must test the exact `pull_request.head.sha`, not only GitHub's synthetic merge ref.
2. **Integration is separate evidence.** The current merge candidate must also pass against the current `main` base.
3. **One stable gate decides merge readiness.** `release-gate` passes only when both exact-head and merge-candidate verification pass.
4. **Main is re-verified after merge.** A successful PR does not substitute for a successful immutable `main` revision.
5. **Deployment provenance is explicit.** A Sites version must be saved from the reviewed `main` commit and `/api/release` must identify the expected release before publication.
6. **Migrations are part of the artifact.** A build is invalid if the migrations required by its runtime are absent from `dist/.openai/drizzle`.
7. **Hosting linkage is part of the artifact.** `.openai/hosting.json` must remain bound to the canonical Sessions Sites project, D1 `DB`, and R2 `BUCKET`.
8. **Documentation cannot declare completion before evidence exists.** Completion matrices and UAT records must name the exact commit and CI result they describe.
9. **No security regression may be accepted to obtain green CI.** Legacy tests are updated to the intended authenticated contract; production access controls are not weakened to preserve old anonymous behavior.
10. **A deployment is not production evidence until the saved/deployed Site version is verified.** GitHub merge status and ChatGPT Sites deployment state are distinct.
11. **Release provenance cannot lag implementation.** `scripts/release-gate.mjs` fails if Phase 5 implementation is paired with an older phase id/status.

## Required sequence

`source change -> release preflight -> production build -> complete regression suite -> exact PR head green -> merge candidate green -> release-gate green -> merge using expected head SHA -> immutable main green -> save private UAT Site version from that main commit -> verify release marker/routes/auth -> UAT -> explicit publish decision`

Any failure returns the process to the earliest invalidated step. A later successful step never waives an earlier failed gate.

## CI jobs

- `verify exact PR head`: checks out `pull_request.head.sha`, passes that SHA to `scripts/release-gate.mjs`, then runs the complete build/regression suite.
- `verify merge candidate`: checks GitHub's current PR merge candidate and runs the same release verification.
- `release-gate`: has no product build logic of its own; it fails unless both preceding jobs succeeded.
- `verify merged main revision`: runs after a push to `main`, checks out the immutable pushed SHA and re-runs the same verification.

The stable status intended for repository rules is **`release-gate`**. Repository rules, where available, should require this check and prohibit force-push/direct-push bypasses to `main`. The repository-side rule is an administrative control; this codebase also retains the fail-closed CI gate because repository settings can change independently of source.

## Repository administrative enforcement

The desired `main` rule is:

- require pull requests before merge;
- require the stable `release-gate` status check;
- require code-owner review for protected release/identity/authorization/migration/hosting boundaries;
- dismiss stale approvals when protected files change;
- prohibit force pushes;
- prohibit direct-push bypass except an explicitly-governed emergency path.

`CODEOWNERS` and the source-side release gate are version-controlled. Repository branch-protection/ruleset configuration is not. If the connected GitHub integration cannot read or mutate administration settings, that inability must be recorded rather than inferred as protection being enabled. Source-complete status does not certify this repository setting.

## UAT handoff record

Before a private UAT Site is considered reviewable, record all of the following together:

- merged `main` commit SHA;
- successful `verify merged main revision` run;
- saved ChatGPT Sites version built from that same commit;
- `/api/release` payload with `id=unified-platform-v1-phase5`, `phase=5`, `phaseStatus=complete`, and Royal Blue `#4169E1`;
- confirmation that D1/R2 bindings and required migrations are preserved;
- audience set to the intended private UAT group;
- smoke checks for login/onboarding, Personal workspace, provider onboarding/workspace switch, Corporate workspace, Booking Operations and Cases;
- explicit note that the version is UAT and has not been promoted to a wider audience unless that promotion was separately approved.

If any one of these identifiers differs, the UAT build is considered unverified and must not be promoted.
