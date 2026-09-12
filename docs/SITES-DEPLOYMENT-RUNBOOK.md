# Sessions ChatGPT Sites deployment runbook

## Purpose

This runbook prevents a healthy GitHub branch from being mistaken for a deployed ChatGPT Site.

The Sessions Site is a versioned hosted output. The local/source project is linked to the hosted project by `.openai/hosting.json`, but a Git push or merge does **not** by itself publish a new Site version.

Current hosted project linkage:

- Sites project: `appgprj_6a9530e0c2548191b905ccc3a663dc4d`
- D1 binding: `DB`
- R2 binding: `BUCKET`
- canonical public origin: `https://sessions-music.kudzimusar.chatgpt.site`

## Required release sequence

1. Start from the current Sessions source project, not from the already-published Site preview.
2. Check out the intended Git commit/branch and make sure the working tree contains `.openai/hosting.json`.
3. Run the production verification gate (`npm test`). The build must package `dist/.openai/hosting.json` and the current `drizzle/` migrations.
4. In ChatGPT desktop/Work/Codex with that source project open, ask Sites to prepare the existing project for deployment. Use wording such as:

   `Deploy this project with Sites. Check whether it is compatible, make any required changes, save a reviewable version first, and tell me which Git commit that version uses. Do not deploy until I approve the saved version.`

5. Inspect the saved Site version and confirm it is associated with the expected Git commit.
6. Review `/mobile` and `/corporate` in the saved preview. Do not deploy a version that still shows the legacy teal/slate production palette.
7. Confirm the release provenance endpoint in the saved version reports:

   - `id`: `unified-platform-v1-phase4`
   - `phase`: `4`
   - `brandPrimary`: `#4169E1`

8. Only then deploy the approved saved version to the existing Sessions Site project.
9. After deployment, verify:

   - `/api/release`
   - `/mobile`
   - `/corporate`
   - the public root route
   - D1-backed reads and R2/private-media authorization

## Do not confuse these states

- **GitHub green:** source builds/tests successfully.
- **Saved Sites version:** Sites has built a deployable candidate from a specific source commit.
- **Deployed Sites version:** that saved candidate is what the public `chatgpt.site` URL actually serves.

A change is not considered live until all three states are aligned.

## Failure triage

### Public Site still shows the old UI

The most likely cause is that the old saved Site version is still deployed. Check the saved version's source commit before debugging CSS.

### Site editor shows `Unexpected Server Error`

First reopen the Site/editor. If the error repeats for a version built from the current source, inspect the Sites build/runtime logs and verify hosted environment variables. Do not assume the old published Site is evidence that the new source failed.

### D1/R2 features fail after a new version is deployed

Confirm the saved build contains `.openai/hosting.json` and the complete `drizzle/` directory, then verify the Site's hosted environment values/secrets. The production build now fails if the hosting manifest or Phase 4 migration package is missing.

## Production certification boundary

The source repository can prove build, tests, packaged hosting metadata, migrations and application authorization contracts. Only a successful saved-version build and deployment from Sites can prove what the public Site is actually serving.
