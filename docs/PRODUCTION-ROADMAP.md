# Sessions production roadmap

Status date: 2 September 2026. Phase R is the current execution authority for moving Sessions from a tested demo to an operating product. Work proceeds W1 → W2 → W3 → W3b → W4 → W5. Open commercial decisions remain configuration and policy data.

## Non-negotiable product contracts

- The server owns identity, roles, prices, totals and every state transition.
- Money is integer cents. Checkout snapshots are immutable.
- Booking inventory remains atomic, idempotent and guarded against stale revisions.
- Every mutating endpoint requires authenticated identity, server-side authorization, same-origin enforcement, bounded validation and negative tests.
- Every external integration is feature-gated. Disabled integrations are absent from the user journey.
- The demo remains available at `/demo` during migration, but must remain private until Phases 1–3 pass real sandbox integration tests.
- D1/R2 remain the production system of record. Supabase is Auth and normalized identity/tenant authorization only.
- `Wewed` is unrelated and must never receive Sessions data or schema changes.

## Phase R roll-call

| Workstream | Outcome | Status | Exit evidence |
| --- | --- | --- | --- |
| W1 | Real identity boundary and self-service studio claim/verification/onboarding | Code-complete and privately deployed; live OTP/OAuth blocked on SMS, Google, CAPTCHA and runtime credentials | `docs/PHASE-R-W1.md`, 90-test checkpoint, applied base Supabase migration |
| W2 | Concierge direct-settlement ledger, proof, statements and invoices | Code-complete and certified for the next owner-only version | `docs/PHASE-R-W2.md`, server arithmetic, stale/idempotency/cross-tenant/export tests |
| W3 | Effective-dated fee policy and add-on pricing engine | Code-complete and privately deployed | 102-test checkpoint; future quotes change while existing snapshots remain byte-stable |
| W3b | 12-session recurring series, membership attendance/settlement ledger and optional loyalty credit | Code-complete and privately deployed | 106-test checkpoint; atomic series, offline membership evidence and default-off studio-specific credit |
| W4 | Booking proof, inbox and consented reminder contracts | Code-complete; private deployment pending | `docs/PHASE-R-W4.md`, QR/ICS/offline reference, message authorization and idempotent delivery logs; live scheduler activation remains gated |
| W5 | Trust, availability search, public persuasion and reviews | Not started | Data-backed badges, completed-booking reviews, mobile Lighthouse gate |
| W5b | Complete phone-first studio operations console | In progress through W1/W2 | Owner can operate bookings and statements on a phone |
| W6 | First-party analytics, backup/restore, error hooks and demo purge | Not started | Executed restore receipt and real-event funnel |

## Earlier production phase map

The numbered map below remains long-range context. Where it conflicts with Phase R ordering or frozen items, the Phase R roll-call above controls. Gateway activation, ZiG, AI live search and native shells remain frozen until explicitly reopened.

## Roll-call

| Phase | Outcome | Status | Exit evidence |
| --- | --- | --- | --- |
| 0 | Governance, owner-only demo boundary and repeatable gates | Complete | Roadmap, env inventory, 79 passing tests, clean typecheck and build |
| 1 | Real phone/Google identity, tenant authorization and self-serve studio onboarding | Code-complete checkpoint; blocked on SMS, Google OAuth, CAPTCHA and runtime secrets for live integration | OTP abuse tests, session revocation, claim/verification, deletion request and cross-tenant proofs |
| 2 | Notifications, booking chat and push | Not started | Consent, webhook, retry, message and deep-link tests |
| 3 | Paynow/Stripe booking payments, refunds, payouts and FX | Not started | Provider sandbox E2E and reconciliation evidence |
| 4 | Verified bookable supply, taxonomy, map and availability search | Not started | Verification state-machine and inventory/search consistency tests |
| 5 | Calendar depth, policies, pricing, waitlists and offline passes | Not started | Boundary policy, conflict, promotion and pass tests |
| 6 | Reviews, trust, disputes and band accounts | Not started | Eligibility, dispute, invite, vote and split tests |
| 7 | Scale, observability, analytics, compliance and mobile hardening | Not started | Load, SLO, audit, retention and app-readiness evidence |

## Phase order

### Phase 1 — identity and authorization

Phone OTP is primary, normalized to E.164 with Zimbabwe `+263` support. Google is the second provider. Sessions uses short-lived access tokens, rotating refresh sessions, app-level device revocation, device management, deletion requests and a reviewed account-linking path. Product roles are `musician`, `provider_owner`, `provider_staff` and `operations_admin`; studio access comes from active organization membership, never a client-selected role. Claiming grants a workspace only; separate Operations verification is required before a studio can become `bookable`.

### Phase 2 — communications

Add consented WhatsApp/SMS/email adapters, delivery webhooks, retries and dead letters. Add one server-scoped chat thread per booking, R2-owned attachments, unread state, FCM/APNs push and booking deep links. In-app messages never auto-send externally.

### Phase 3 — payments

Use Paynow first for Zimbabwe and Stripe for international cards. Implement authorization/capture, refunds, provider earnings and payouts, immutable USD/ZiG FX snapshots and nightly reconciliation. Tests use sandbox providers only and must never make real charges.

### Phase 4 — verified supply

Turn approved claims into bookable rooms with structured equipment, power backup, access, security and capacity. Add availability-first search, verified pins, saved searches and an Operations supply-acquisition funnel. Test inventory and search against the same slot engine.

### Phase 5 — scheduling depth

Add two-way calendar boundaries, room-selected cancellation templates, peak/off-peak prices, add-ons, promo codes, waitlists, booking-window rules, configurable recurring series, offline booking QR and wallet passes.

### Phase 6 — trust and bands

Keep completed-booking review eligibility, then add responses, attachments, moderation, provider trust badges and disputes. Add shared band profiles, scoped invites, availability voting and integer-cent payment splitting.

### Phase 7 — hardening

Normalize search data into an indexed store, load-test booking contention at 1,000+ requests, add traces/metrics/alerts, immutable Operations audit, privacy/terms/tax/data-retention controls and first-class PWA/native readiness.

## Gate required at every checkpoint

1. Existing and new tests pass with real D1/R2 bindings where applicable.
2. `npx tsc --noEmit` passes independently.
3. Production build succeeds.
4. New migrations are appended, inspected and tested; deployed migrations are never rewritten.
5. Documentation and `.env.example` match runtime behavior.
6. GitHub CI is green on the exact migrated tree.
7. Phases 1–3 also require mobile-width manual QA against real sandbox integrations before public launch.
