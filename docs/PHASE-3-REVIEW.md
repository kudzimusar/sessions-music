# Phase 3 Review — Workforce IAM, Privileged Administration and Data Scope

Status: COMPLETE AND HARDENED IN SOURCE
Review date: 12 September 2026
Branch: `implementation/unified-platform-v1`

## Purpose

Phase 3 expands Sessions corporate authority without turning company titles or organizational reporting lines into application privilege. The governing model remains:

- Supabase is the trusted production identity and platform-role authority source.
- D1 stores Sessions governance, security-event, privileged-session and access-review records; those records do not grant platform authority.
- R2 stores media bytes, while access to restricted/confidential media is decided by server-side field/scope policy.
- Provider tenancy, customer ownership and corporate permissions remain distinct scopes.
- The `/demo` sandbox cannot activate production privileged administration.

This review was performed as a release-candidate hardening pass before Phase 4 work begins.

## Phase 3 controls implemented

### 1. Explicit platform authority hierarchy

Sessions recognizes separate customer, provider and corporate roles. Super Admin is the only application role with `platform:roles.manage`; organization titles, reporting lines and delegations do not grant platform authority.

Corporate offices remain permission-separated. Finance, Trust & Safety, Support and Provider Operations do not automatically inherit one another's sensitive capabilities.

### 2. Production identity and MFA assurance boundary

Privileged administration relies on the verified production identity principal and its trusted assurance level. A client-visible role claim or preview identity cannot self-promote.

A Super Admin must have verified AAL2 assurance before activating privileged administration. Sessions does not simulate MFA when the production identity provider has not supplied AAL2.

### 3. Short-lived privileged administration

Privileged administration is:

- available only to an existing Super Admin;
- unavailable to the ChatGPT preview identity;
- bound to the exact identity-provider session;
- limited to a 15-minute window;
- purpose-labelled;
- explicitly revocable;
- automatically invalid when expired or when the identity session changes;
- audited on activation, replacement, expiry and revocation.

Role mutation endpoints require both Super Admin authority and a current privileged session.

### 4. Verified platform-role mutations

Platform-role changes are written to the trusted Supabase authority source and then read back. A grant/revoke is not treated as successful unless the authoritative active-role state matches the requested result.

The D1 security log records `platform_role.change_requested` before the external authority mutation. This prevents an external mutation from occurring without any reconstructable local intent.

If Supabase mutation or verification fails, a failure security event is attempted. If the authority mutation succeeds and is verified but the final D1 outcome event cannot be written, the API reports a successful authority change with an explicit audit-reconciliation warning instead of incorrectly claiming the role change failed.

A Super Admin cannot remove its own Super Admin authority through its own privileged role-control endpoint.

### 5. Access-review workflow

`/corporate/access` is a dedicated Super Administration surface for authority governance.

An access review:

- snapshots active managed `platform_role_assignments` from the trusted Supabase authority source;
- does not copy or grant authority in D1;
- records retain/revoke decisions separately from remediation;
- requires a current privileged session for mutations;
- records named reviewers and review timestamps;
- prevents completion while any decision is pending;
- prevents completion while any revoke decision is not successfully remediated;
- prevents the current Super Admin from remediating its own Super Admin revocation;
- treats successful remediation as immutable; restoration must be a new authority change/review rather than rewriting history;
- requires due dates, when supplied, to be in the future.

Remediation writes a D1 intent event before touching Supabase, verifies the authoritative revocation, and then records completion. Failure remains visible and retryable.

### 6. Database-level access-review invariants

Application checks are reinforced by additive D1 triggers in `drizzle/0016_access_review_invariants.sql`.

D1 rejects impossible governance states, including:

- pending decisions carrying reviewer/remediation completion state;
- retain decisions carrying remediation state;
- revoke decisions with no reviewer/review time;
- completed remediation with no remediation timestamp;
- editing a successfully remediated decision;
- editing items after a review is closed;
- completing a review with pending decisions or incomplete revocations;
- reopening/changing an already closed review state.

The database therefore cannot silently claim a security state that the workflow did not legitimately reach, even if future application code regresses.

### 7. Central field/scope data-access policy

`lib/data-access-policy.ts` centralizes sensitive-resource classification and access rules.

Current classifications include:

- workforce directory — internal;
- workforce identity — restricted;
- studio verification evidence — restricted;
- settlement proof — restricted;
- booking-message attachments — confidential;
- private uploads — confidential.

Classification alone never grants access. Server endpoints also require the relevant permission or tenant/booking relationship.

Important negative rules include:

- ordinary corporate directory visibility does not expose workforce identity UUIDs, work email or employment type;
- Trust & Safety may review verification evidence but does not inherit Finance settlement evidence;
- Finance may review settlement evidence but does not inherit Trust verification evidence;
- provider access remains scoped to the active studio relationship;
- customer settlement evidence remains booking-customer scoped;
- corporate Operations does not inherit customer–studio private booking-message attachments merely because it is an administrative role.

### 8. Restricted-media cache hardening

Restricted/confidential media responses now use:

`Cache-Control: private, no-store, max-age=0`

with `Pragma: no-cache` on successful private responses. Denied/error private paths also fail closed with no-store semantics.

Only intentionally public, referenced room photography retains public caching.

This removes the previous one-hour browser-cache window in which sensitive evidence could remain locally reusable after authorization was revoked.

### 9. Super Administration operator UX

The corporate control centre now exposes the real assurance/elevation state rather than allowing operators to discover the security gate only after a failed mutation.

Super Admin can see:

- current AAL level;
- whether privileged administration is active;
- elevation purpose and expiry;
- activate/revoke controls;
- locked role controls when elevation is inactive;
- direct navigation to Access Reviews.

The interface explicitly states that production MFA must be completed at the identity provider and is never simulated by Sessions.

## Hardening defects found and corrected

The hardening pass identified material issues rather than merely re-running tests:

1. Private evidence was browser-cacheable for one hour. It is now `no-store`.
2. Platform-role writes previously trusted the external write response without an authoritative read-back. They are now verified against Supabase.
3. A successful Supabase role mutation followed by a failed D1 outcome-audit write could previously surface as a generic failure even though authority had changed. Pre-mutation intent and explicit post-success reconciliation semantics now remove that ambiguity.
4. Access-review decisions could previously be edited after successful revocation remediation, creating governance history inconsistent with real authority. Remediated decisions are now immutable.
5. Access-review state invariants previously lived only in application code. D1 triggers now enforce the state machine independently.
6. Malformed stored access-review note JSON could fail the whole review read. Review note parsing is now defensive.
7. Access Review was route-protected but not clearly discoverable from Super Administration. It is now directly linked from the corporate control centre.

## Regression evidence

Final hardening head before this review document: `2b0f64543c369ecdf1a136f24315a8ae741e4d0b`.

GitHub Actions Sessions CI run `34664412655` completed successfully.

The verified command was the repository `npm test` workflow, which runs the bounded production build followed by the complete Node test suite.

Result:

- production build: PASS;
- tests: 164;
- passed: 164;
- failed: 0;
- cancelled: 0;
- skipped: 0.

The suite includes negative authorization, tenant isolation, privileged-session, access-review, data-scope, media privacy, database invariant and production Worker regression coverage.

## Source-complete versus deployment-certified

Phase 3 is complete and hardened **in source**. It is suitable to become the dependency baseline for Phase 4 after this documentation-only close-out remains green.

The following is deliberately not claimed as completed production certification:

1. The actual Sessions Supabase project is not exposed through the Supabase connector available in this chat. The only visible Supabase project was unrelated (`church-os-dev`) and was not modified.
2. Therefore the Sessions Supabase authority hierarchy migration and real production MFA/AAL2 flow have not been applied or exercised against the live Sessions Supabase project through this session.
3. D1 migrations `0014_privileged_administration.sql`, `0015_access_reviews.sql` and `0016_access_review_invariants.sql` are implemented and tested in source, but live-environment migration/application must still be confirmed during deployment/UAT/release certification.
4. Source tests prove the authorization contracts and failure behavior; they do not substitute for end-to-end production identity-provider certification.

These are deployment gates, not reasons to weaken the source authority model.

## UAT review routes

When this branch is deployed/synchronized to a UAT-capable Sessions environment, the primary Phase 3 routes are:

- `/corporate` — authority overview and privileged-session controls;
- `/corporate/access` — access reviews and remediation;
- `/corporate/organization` — organization directory with restricted workforce fields permission-scoped;
- `/corporate/trust` — Trust & Safety evidence scope;
- `/corporate/finance` — Finance scope;
- `/corporate/support` — Support scope;
- `/corporate/providers` — Provider Operations scope;
- `/registry-admin` — combined Operations surface requiring the combined permission set.

Legacy `/admin` redirects to `/corporate`.

There is currently no repository-configured branch-preview/UAT deployment workflow, and the connected Vercel account has no Sessions project. The known ChatGPT Sites production origin is `https://sessions-music.kudzimusar.chatgpt.site`, but this review does not claim that the unmerged implementation branch is currently deployed there.

## Phase exit decision

**Phase 3 exit: PASS — complete and hardened in source, full regression suite green.**

Phase 4 must not relax these controls. Corporate control-plane modules introduced next must consume the existing permission, privileged-session, access-review and field/scope boundaries rather than introducing parallel authority logic.
