# Sessions ChatGPT Sites deployment runbook

## Purpose

This runbook prevents a healthy GitHub branch from being mistaken for a deployed ChatGPT Site.

The Sessions Site is a versioned hosted output. The local/source project is linked to the hosted project by `.openai/hosting.json`, but a Git push or merge does **not** by itself publish a new Site version.

Current hosted project linkage:

- Sites project: `appgprj_6a9530e0c2548191b905ccc3a663dc4d`
- D1 binding: `DB`
- R2 binding: `BUCKET`
- canonical public origin: `https://sessions-music.kudzimusar.chatgpt.site`

Current source release target:

- release id: `unified-platform-v1-phase5`
- phase: `5`
- phase status: `complete`
- brand primary: `#4169E1`

## Required release sequence

1. Start from the current Sessions source project, not from the already-published Site preview.
2. Check out the intended merged `main` commit and make sure the working tree contains `.openai/hosting.json`.
3. Confirm the immutable `main` CI run is green and retain its `sessions-release-evidence-main-<sha>` artifact.
4. Run the production verification gate (`npm test`) if validating locally. The build must package `dist/.openai/hosting.json` and the current `drizzle/` migrations.
5. In ChatGPT desktop/Work/Codex with that source project open, ask Sites to prepare the existing project for deployment. Use wording such as:

   `Build a private reviewable Sessions Site version from this exact merged main commit. Do not publish or deploy it. Confirm the saved version's source commit, /api/release payload, D1 DB binding and R2 BUCKET binding.`

6. Inspect the saved Site version and confirm it is associated with the expected merged `main` commit.
7. Confirm the release provenance endpoint in the saved version reports:

   - `id`: `unified-platform-v1-phase5`
   - `phase`: `5`
   - `phaseStatus`: `complete`
   - `brandPrimary`: `#4169E1`

8. Review the private UAT routes before any publication:

   - `/welcome`
   - `/onboarding`
   - `/mobile`
   - `/account`
   - `/onboarding/provider`
   - `/manage`
   - `/corporate`
   - `/corporate/bookings`
   - `/corporate/incidents`

9. Exercise the Phase 4.5/5 lifecycle rather than checking screenshots only: sign in, complete profile and required consent, verify Personal access, provider onboarding/context selection, corporate context authorization, Booking Operations and Cases. An authenticated but incomplete identity must remain in onboarding.
10. Confirm the approved production brand is Black / Royal Blue / White and that legacy teal/slate is not acting as the production identity.
11. Confirm the intended hosted D1 environment has all required migrations applied in order, including Phase 4.5/5 migrations, and verify R2/private-media authorization.
12. Only after private UAT succeeds should the saved version be considered eligible for a separate publish/deploy decision.
13. After any approved deployment, verify `/api/release`, the critical routes above, D1-backed reads and R2/private-media authorization again against the deployed version.

## Do not confuse these states

- **GitHub green:** source builds/tests successfully.
- **Merged main green:** the exact immutable merge commit has passed the post-merge verification gate.
- **Saved Sites version:** Sites has built a deployable private candidate from that exact source commit.
- **Deployed Sites version:** that saved candidate is what the public `chatgpt.site` URL actually serves.

A change is not considered live until all applicable states are aligned.

## Failure triage

### Public Site still shows an old release

First compare `/api/release` with the expected Phase 5 marker and compare the saved/deployed Site version's source commit with the reviewed merged `main` SHA. Do not debug CSS or product code until provenance is aligned.

### Site editor shows `Unexpected Server Error`

First reopen the Site/editor. If the error repeats for a version built from the current source, inspect the Sites build/runtime logs and verify hosted environment variables. Do not assume the old published Site is evidence that the new source failed.

### D1/R2 features fail after a new version is saved or deployed

Confirm the saved build contains `.openai/hosting.json` and the complete `drizzle/` directory, then verify the Site's hosted environment values/secrets and hosted migration state. The production build fails if the hosting manifest or required Phase 4/4.5/5 migration package is missing.

## Production certification boundary

The source repository can prove build, tests, packaged hosting metadata, migrations, release provenance and application authorization contracts. Only a successful private saved-version build, hosted migration/configuration verification and UAT from Sites can certify the hosted Phase 5 candidate. Publication remains a separate explicit decision.
