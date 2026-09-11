# Sessions

Sessions is a persistent, mobile-first **music rehearsal infrastructure marketplace for Zimbabwe**. Its first promise is simple: **“I need somewhere to rehearse.”** It is not a generic appointment app, social network, streaming product, events product or classifieds board.

The repository intentionally contains two trust domains:

- `/` — a sourced Harare studio registry. These are public profiles and are not automatically bookable or verified providers.
- `/demo` — the full rehearsal-marketplace transaction demo using ten clearly fictional Harare spaces. This is where discovery, live inventory logic, checkout states, recurring bookings, provider controls and operations are exercised.

See [`docs/TAKEOVER-2026-09-11.md`](docs/TAKEOVER-2026-09-11.md) for the latest customer-surface rebuild and the exact production boundaries that remain.

## Marketplace demo

The musician flow is:

1. Search by neighbourhood, date, time, duration, group size, equipment, budget and practical requirements.
2. Optionally describe the rehearsal in natural language; Sessions converts recognised needs into visible, editable filters.
3. Compare photo-led room inventory and open a room detail page.
4. Choose only a valid slot. Provider blocks, existing bookings, opening hours, reset buffers and minimum duration are real constraints.
5. Repeat weekly for 2 or 4 sessions only when every occurrence is valid.
6. Review provider subtotal, configurable platform fee, refundable deposit, total, room package and cancellation terms.
7. Simulate an instant payment or a provider-approval authorization. No real money moves in the demo.
8. Use the booking reference, receipt, calendar file, share actions, cancellation and repeat-booking flows.
9. A completed demo booking can create a review.

Provider routes expose a dashboard, room editor, equipment, provider-controlled prices, public hours, internal blocks, booking requests, completion states, revenue ledger and payout placeholders. Operations exposes verification/suspension, booking/payment lookup, incidents, review moderation and configurable platform fees.

The ten fictional spaces vary by Harare area, provider type, capacity, equipment, backup power, rate, cancellation policy, booking model and public hours. **No fictional venue is presented as a real verified business.** Room photography and addresses are explicitly illustrative/sample data.

## Current frontend architecture

- `app/sessions-v2.tsx` — active customer marketplace for `/demo`, `/space/*`, `/bookings`, `/booking/*`, `/saved` and `/profile`; also provides the shell for provider and operations routes.
- `app/sessions-v2.css` — dedicated marketplace design and responsive system.
- `app/sessions.tsx` — pre-takeover customer implementation retained for migration/reference safety, but not used by active demo routes.
- `app/provider.tsx` — multi-room provider dashboard, calendar, room editor, requests and revenue/payout-state UI.
- `app/operations.tsx` — demo marketplace operations.
- `app/registry.tsx` — sourced public studio registry and real-profile flows.
- `app/studio-manager.tsx`, `app/studio-onboarding.tsx` and related registry modules — studio participation/management flows.
- `app/polish.css` — shared provider/operations/registry visual refinement.
- `lib/domain.ts` — typed rooms/bookings, integer-cent money, Zimbabwe-local dates, slot validation, recurring constraints, pricing and deterministic music-specific search interpretation.
- `lib/services.ts` — replaceable payment, map, notification and search contracts.

The product palette is light and practical: `#FFFFFF`, `#F7F9FC`, `#1F4E79`, `#101828`, `#667085`, `#EEF3F8`, `#2F80ED`; green is reserved for availability/confirmed/success semantics.

## Persistence and booking integrity

No browser storage is authoritative for marketplace state. D1 persists workspaces, rooms, bookings, favourites, blocks, reviews, incidents and configuration; R2 is used for authorised media.

Core demo tables include:

| Table | Purpose |
|---|---|
| `workspaces` | isolated owner record, profile, favourites, fee configuration, incidents and revision |
| `rooms` | scoped provider/room snapshot including hours, equipment, prices and image references |
| `bookings` | immutable checkout amounts, booking/payment state, idempotency key and completed review |
| `slot_claims` | unique room/date/30-minute inventory claims, including reset buffers and manual blocks |
| `blocks` | internal reservations, closures and blackout intervals |
| `uploads` | media metadata/ownership; bytes live in R2 |
| `operation_guards` | optimistic revision guard used inside transactional mutation batches |

Mutations are scoped to authenticated identity. Booking mutations calculate totals server-side rather than trusting client-submitted amounts. Slot claims reject overlaps. Recurring reservations validate all occurrences and commit all-or-none. Replaying the same booking key returns the existing reservation rather than creating a duplicate.

Booking states: `pending_approval`, `confirmed`, `completed`, `cancelled`.

Payment states: `authorized`, `paid`, `refunded`, `partially_refunded`, `void` — all demo states until a live payment rail is connected.

A declined simulated payment creates no booking/inventory claim. Approval-required requests hold inventory and authorize; approval captures the demo payment, decline voids it and releases the slot. Cancellation releases inventory; the demo refund follows the room's 24/48-hour cancellation rule.

## Pricing, fees and currency

All money uses integer cents. USD is the enabled checkout currency. The domain is ZiG-ready, but ZiG checkout must not be enabled until a real rail, denomination/FX policy and reconciliation process exist.

The seed service fee is 1,000 basis points (10%) as an editable planning assumption. It is **not a hard-coded business rule**. Operations can change the fee for future quotes; existing bookings retain their immutable fee snapshot.

Providers independently control hourly rate, minimum duration, deposit, instant-vs-approval booking, cancellation policy and public hours. Sessions does not dictate provider pricing.

## Search interpretation

`parseSearch` is a deterministic, rules-based interpreter, not a live AI integration. It recognises common music requirements including:

- neighbourhoods;
- group/band/choir size;
- weekday, today/tomorrow, exact time and dayparts;
- duration and budget;
- drums, PA/sound system, microphones, bass/guitar amps, keyboard, piano, stands and acoustic treatment;
- backup power, parking and step-free access;
- verification/cancellation preference;
- instant booking versus provider approval;
- band, solo, choir/worship and institutional categories.

The customer UI always exposes the interpreted constraints so they can be edited. A future live model should implement the same structured boundary with schema validation, cost limits and provider-independent recommendations. AI must never invent availability or override provider pricing.

## Authentication and trust boundary

The private demo supports the platform's ChatGPT identity flow and trusted authenticated-user headers. Mutating endpoints reject missing identity and cross-origin mutation requests. Never trust a client-submitted owner or role.

Public email/phone authentication is not complete for a live marketplace. Before launch, add supported public identity, real organisation membership, musician/provider/admin authorisation, privacy/consent policy and abuse controls.

The sourced studio registry remains deliberately separate from fictional booking inventory. A public profile does not become bookable merely because it was discovered online or claimed by a first applicant.

## Integration status

- **Payments:** deterministic demo gateway only. Production requires real server-side authorization/capture, webhooks/signature verification, expiry, refunds, settlement and reconciliation.
- **AI:** rules-based interpreter only; live model intentionally not required for the demo.
- **Maps:** neighbourhood-level map context for fictional inventory; no fabricated precise pins. Sourced registry location handling follows its own evidence rules.
- **WhatsApp/share:** native share/clipboard and user-triggered `wa.me` deep links. No automatic WhatsApp API messaging.
- **Email/notifications:** in-app records exist; production delivery needs configured provider credentials/consent and scheduler activation.
- **Storage:** D1/R2 are active. Production still needs image transformation, abuse scanning, retention/orphan cleanup and operational review.
- **Payouts/verification:** workflow/ledger placeholders exist; real identity verification and settlement are not claimed.

## Validation

The GitHub workflow runs `npm test` on every push to `main`. `npm test` performs the production build and then runs the complete Node test suite.

Coverage includes:

- authentication and Origin enforcement;
- server pricing and fee snapshots;
- booking idempotency;
- overlapping inventory and reset buffers;
- recurring conflict rollback;
- institutional blocks;
- failed/authorized/captured/void/refunded demo payment states;
- cancellation and inventory release;
- completed reviews/moderation;
- account isolation;
- public registry and management behavior;
- booking communications/settlements/retention;
- production Worker rendering with local D1/R2 bindings;
- the rebuilt customer surface and mobile visual contracts;
- music-specific search interpretation.

The 11 September 2026 takeover passed the full production CI gate after activation of `sessions-v2`.

A green CI build is **not** a substitute for physical-device or live-provider certification. The following remain launch work: signed-in iOS/Android QA, assistive-technology UAT, real payment/provider credentials, real venue/equipment verification, scheduler activation, production load/concurrency testing and live settlement/dispute procedures.

## Environment and launch path

`.openai/hosting.json` declares the logical `DB` and `BUCKET` resources used by the Sites runtime. Do not check in secrets, real payment credentials or private customer/provider data. Future provider credentials belong in managed environment variables with non-secret names documented in `.env.example`.

Keep the current domain principles when normalising the production data model: server-scoped authorisation, integer money, immutable booking/payment snapshots, provider price sovereignty and transactional inventory constraints.

Before public launch, complete real provider onboarding/moderation, public identity/roles, verified venue data, payment holds/webhooks/refunds/payouts, reliable consented notifications, security/load testing and accessible mobile UAT.

## Further documentation

- [`docs/PRODUCT-BRIEF.txt`](docs/PRODUCT-BRIEF.txt) — governing product specification.
- [`docs/TAKEOVER-2026-09-11.md`](docs/TAKEOVER-2026-09-11.md) — latest rebuild/gap record.
- [`docs/UX-AUDIT.md`](docs/UX-AUDIT.md) — competitive/design interpretation.
- [`docs/REGISTRY-IMPLEMENTATION.md`](docs/REGISTRY-IMPLEMENTATION.md) — sourced registry and claim workflow.
- [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) — integration/launch guide.
- [`docs/PRODUCTION-ROADMAP.md`](docs/PRODUCTION-ROADMAP.md) — production migration boundary.

Run the same local gates as CI before shipping: `npm test`. For focused development, `npx tsc --noEmit --incremental false` and individual `node --test tests/<name>.test.mjs` files remain useful.
