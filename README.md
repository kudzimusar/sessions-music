# Sessions

A persistent, mobile-first rehearsal-infrastructure marketplace demo for Zimbabwe. The first promise is **“I need somewhere to rehearse.”** Not a general booking service, social network, streaming product or classifieds app.

## Try the complete demo

1. Discover spaces by neighbourhood, date, duration, group size, equipment, budget and practical requirements.
2. Open a room, check its equipment and public hours, choose an available slot and review checkout.
3. Sign in with ChatGPT to save your workspace. Give the band a sample name, accept the demo terms, and simulate payment. No real money or venue reservation is involved.
4. Open My bookings for the reference, full receipt, calendar download, manual sharing, cancellation and repeat booking.
5. Open List your space for the provider dashboard, room editor, public hours, manual/internal blocks, approval queue and demo revenue ledger.
6. Provider → Bookings → Simulate completion enables a completed-booking review. This is explicitly a simulation.
7. Operations supports sample verification, listing suspension, booking/payment lookup, incident resolution, review visibility and fee configuration.

The app includes ten fictional Harare spaces, multiple provider types, varied prices/equipment/capacities, instant and approval-required booking, and institutional hours. **No fictional business is described as a verified real provider.** Generated room photography is illustrative. Provider/admin personas belong to the same isolated demo owner and cannot access another user's data.

## Architecture

- Preserved Sites starter: Vinext / React 19 / TypeScript / Tailwind; vendored Shadcn controls.
- `app/sessions.tsx`: musician discovery, detail, checkout, booking, saved and profile flows.
- `app/provider.tsx`: room management, weekly hours, blocks, requests and ledger. Loaded on demand.
- `app/operations.tsx`: isolated demo operations. Loaded on demand.
- `lib/domain.ts`: typed rooms/bookings, integer-cent money, Zimbabwe-local dates, availability, pricing, recurring and interpretation helpers.
- `lib/services.ts`: replaceable payment, map, notification and search interface contracts. Server actions invoke the mock payment adapter; the deterministic search interpreter is labelled rules-based, not live AI.
- `app/api/state`: authenticated workspace state, anonymous sample discovery.
- `app/api/action`: server validation and all scoped state mutations; ignores client-submitted totals.
- `app/api/upload`, `app/api/media/[id]`: authenticated R2 image upload/read with size, signature, content type and ownership checks.
- `db/store.ts`: D1 access via prepared statements and scoped seeding.
- `db/schema.ts`, `drizzle/`: schema and immutable migrations applied by Sites.

No browser storage is authoritative. Bookings, profiles, favourites, blocks, rooms, reviews, incidents and configuration survive refresh through D1. The browser loads a fresh workspace from the server. Source is stored with the Site repository.

## Current data model

| Table | Purpose |
|---|---|
| workspaces | One isolated owner record; profile, favourites, fee configuration, incident queue, revision |
| rooms | Scoped room/provider snapshot including hours, equipment, prices and image references |
| bookings | Immutable checkout amounts; explicit booking/payment states; reference and request idempotency key; completed review |
| slot_claims | Unique owner/room/date/30-minute inventory claims, including reset buffers and manual blocks |
| blocks | Scoped internal reservations, one-off closures and blackout intervals |
| uploads | Image metadata and owner; bytes live in R2 |
| operation_guards | Transaction-only optimistic revision guard, rejects stale writers and rolls back entire batch |

Every mutation is scoped to the authenticated header identity. A D1 `batch()` commits the revision guard, related record mutations and inventory claims atomically. Unique slot keys reject conflicts. A recurring booking of 2 or 4 weekly sessions validates each date and commits all or none. Retries with the same booking key return the existing reservation. Schema creation never occurs in request handlers; sample seeding is separate from migrations.

Booking states: `pending_approval`, `confirmed`, `completed`, `cancelled`.
Payment states: `authorized`, `paid`, `refunded`, `partially_refunded`, `void` (all demo states).
A declined simulated payment creates no booking or inventory claims. Approval requests hold inventory and authorize, then capture only on provider approval. Decline voids the authorization. Cancellations release slots; full refund before the room's 24/48-hour deadline, deposit only afterward. Late provider cancellation/refund adjudication and real settlement are future production work.

## Fees, currency and pricing sovereignty

All amounts use integer cents and are computed on the server. USD is the only enabled checkout currency. The currency type supports ZiG; FX, denomination rules and a payment rail must be integrated before activating it.

The initial sample service fee is 1,000 basis points (10%), an editable planning assumption in Operations. It is **not a fixed business rule**. Changing it affects future quotes only. Providers independently set their hourly rate, minimum duration, deposit and cancellation terms. Sessions does not dictate prices. Provider revenue excludes platform fees and refundable deposits.

## Authentication and safety boundary

The current Sites platform supports the dispatch-owned ChatGPT sign-in flow and forwards trusted authenticated-user headers. Mutating endpoints reject missing identity. Requests with a cross-origin Origin header are rejected. Never trust a client-supplied owner or role.

Public email/phone OTP authentication is **not implemented**. Email/phone fields are optional unverified profile data, not login methods. Before a public marketplace launch, select a supported external authentication path and implement real organisation membership, distinct musician/provider/admin authorization, privacy policies and anti-abuse controls. Do not widen this private demo into a live marketplace as-is.

## Mocked / unconnected integrations

- **Payments:** `PaymentGateway` has a deterministic demo adapter with success, authorized and failure outcomes. No real card/mobile-money details are requested, money moved or provider contacted. Production needs server-side intents/holds, webhooks, signature verification, idempotency, authorization expiry, refund and settlement reconciliation.
- **AI:** deterministic `parseSearch` handles common group/location/equipment/time/budget expressions. It exposes interpreted filters and caveats. Live AI must implement `SearchInterpreter` with schema validation, editable constraints, cost limits and provider-independent recommendations.
- **Maps:** actual OpenStreetMap neighbourhood map/link; no invented precise pins. Sample room addresses are explicitly not real.
- **WhatsApp/share:** user-triggered native share/clipboard and wa.me links only. No automatic messages are sent. Outbound email and WhatsApp APIs need configured adapters and consent.
- **Storage:** platform D1/R2 are active; image upload is limited to JPEG/PNG/WebP up to 5 MB. Room gallery holds up to 5 image references. Production requires image transformation, abuse scanning, retention and orphan cleanup.
- **Payouts and verification:** demo workflow/ledger only, no real settlement or identity certification. Completed-booking reviews are attributable inside the demo.

## Environment

No application API secrets are required for the demo. `.openai/hosting.json` declares logical `DB` and `BUCKET`; Sites owns the actual resources. Do not check in credentials, real payment information or private personal data. Future service credentials must live in managed runtime environment variables, with a matching nonsecret `.env.example` when an integration is actually enabled.

## Validation

- `node --test tests/booking-engine.test.mjs` — 18 behavioural tests using the actual action handlers and schema over SQLite with a D1-shaped transaction adapter. Authentication is injected only in the test bundle, never in deployed code.
- Tests cover missing identity, Origin rejection, idempotency, server pricing, atomic overlap and reset buffers, simultaneous reservations, recurring conflict rollback, institutional blocks, failed payment, cancellation/refund release, approval capture, review completion/moderation, account isolation and fee snapshot preservation.
- `node --test tests/rendered-html.test.mjs` — production Worker output tested in Miniflare with actual local D1/R2 bindings: rendered HTML, identity enforcement, persisted booking restoration, conflict rejection and owner isolation. Test fixture headers simulate dispatcher identity; this is not a live authentication-browser test.
- `npx tsc --noEmit --incremental false` — TypeScript validation.
- `node --test tests/*.test.mjs` after production output exists — domain/API tests plus rendered metadata and vendored UI contract checks.
- Sites checkpoint runs the production build and packaging gate.
- Bounded browser check confirmed discovery and room-detail navigation, equipment, public-hour and slot states. The preview was unauthenticated. **Full signed-in browser checkout, mobile viewport testing, live notification/payment checks and production D1 concurrency load testing were not completed.** Responsive breakpoints, keyboard/focus states, semantic form labels, lazy images and reduced-motion styles are implemented; no mobile/performance certification is claimed.

## Database migration / launch path

Keep the domain and service contracts. Replace scoped JSON aggregates with normalized users/profiles, organisations/members, venues/rooms/equipment/photos, availability rules/exceptions, bookings/items, payments/refunds/payouts, reviews, incidents/disputes and fee rules. Keep server-scoped authorization, immutable checkout snapshots, integer money and transactional inventory constraints. Do not migrate test fixtures as verified inventory.

Before launch: real provider onboarding and moderation; supported public email/phone auth; distinct role and organisation permissions; verified venue addresses and equipment; production payment holds/webhooks/refunds; calendar expiry/reconciliation; reliable notifications; accessible mobile and assistive-technology UAT; security, load and performance tests. PWA manifest is included, but offline booking is intentionally unavailable and offline requests must never imply a reservation.

Future musician/equipment/recording marketplaces are deliberately not built. Extend the same identity, availability, payment and trust contracts only after rehearsal-marketplace demand is proven.

Source requirements: `docs/PRODUCT-BRIEF.txt`. Public competitive audit and design interpretation: `docs/UX-AUDIT.md`.

## Real studio registry (August 2026 update)

The default homepage now opens the sourced Harare registry. The previous fictional booking experience is preserved at `/demo`. See `docs/REGISTRY-IMPLEMENTATION.md` for the claim workflow, source audit, permissions, mobile implementation, limitations and verification details. Real studios start unclaimed and non-bookable. Use `/registry-admin` as a configured registry operator, `/manage` as a verified studio owner/manager, and `/account` to track claims or accept staff invitations.

Production runtime requires `SESSIONS_ADMIN_EMAILS` (comma-separated trusted reviewer emails); it is configured in Sites, not checked into source. Never auto-promote a first claimant. External participation requires a separate, intentional sharing decision; this update does not change audience. No invitations, payments or notifications are sent by these new flows.

## Discovery, onboarding and subscriptions expansion

See [product decisions](docs/EXPANSION-PLAN.md) and [integration and launch guide](docs/INTEGRATIONS.md) for near-me privacy, guided/AI planning, studio registration, term-based membership discounts and Stripe/PayPal/Paynow adapters. New routes: `/planner`, `/register`, `/onboarding/:studioId`, `/subscriptions`. AI and checkout remain explicitly disabled until secure configuration and merchant/callback checks are completed. No live charge or AI request has been made.

Run `node --test tests/expansion.test.mjs tests/registry.test.mjs tests/booking-engine.test.mjs` and `npx tsc --noEmit --incremental false` before the lifecycle build. After the checkpoint build, `node --test tests/*.test.mjs` includes rendered Worker routes.
