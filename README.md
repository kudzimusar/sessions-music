# Sessions

Sessions is a persistent, mobile-first **music rehearsal infrastructure marketplace for Zimbabwe**. Its first promise is simple: **“I need somewhere to rehearse.”** It is not a generic appointment app, social network, streaming product, events product or classifieds board.

The architecture is now deliberately one product with multiple authority surfaces. Customer, provider and corporate users operate on the same production marketplace data; they do not own separate applications or separate production booking systems.

See [`docs/AUTHORITY-AND-UNIFICATION.md`](docs/AUTHORITY-AND-UNIFICATION.md) for the current authority model and [`docs/TAKEOVER-2026-09-11.md`](docs/TAKEOVER-2026-09-11.md) for the customer-surface rebuild history.

## Production product surfaces

| Route | Purpose |
|---|---|
| `/` and `/studios` | Public discovery from the sourced Zimbabwe studio registry |
| `/studio/:id` | Real studio profile; bookable only after provider setup/verification rules are satisfied |
| `/requests` | Customer booking/request history |
| `/account` | Identity, account and notification settings |
| `/manage` | Provider organization/studio workspace |
| `/corporate` | Sessions corporate control centre with office-scoped authority |
| `/registry-admin` | General marketplace Operations console, protected by the full Operations permission set |
| `/demo` | Optional fictional/sample booking sandbox; not the production marketplace |

Legacy URLs converge on those production surfaces: `/provider → /manage`, `/admin → /corporate`, `/bookings → /requests`, and `/profile → /account`.

The sourced registry remains evidence-aware: a business appearing in public discovery is **not automatically a verified or bookable Sessions provider**. Provider ownership, room configuration, availability and verification are separate controlled states.

## One production data domain

Cloudflare **D1** is the authoritative product database and **R2** stores authorized media. The production marketplace already contains global tables for:

- sourced studio registry and provider registrations;
- ownership claims and verification requests;
- provider staff and organization-linked access;
- real studio bookings and global slot claims;
- settlement records, invoices and fee policies;
- recurring booking series;
- memberships and loyalty ledgers;
- booking vouchers, messages, read state and notifications;
- uploads/media ownership and audit records.

Server-side booking logic prices reservations, enforces identity/tenancy, prevents conflicting slot claims, handles reset buffers and keeps booking/payment snapshots auditable. Browser storage is never authoritative.

The older per-user `workspaces`, `rooms`, `bookings`, `slot_claims` and `blocks` tables remain only for the explicit `/demo` sandbox. They are not the target architecture for production marketplace traffic.

## Identity and authority

Production identity and tenant authorization are designed around **Supabase Auth**, while D1/R2 remain the product-data layer. The server verifies the bearer session and obtains effective roles/memberships from the `current_identity()` RPC; clients cannot submit or promote their own role.

The platform hierarchy is:

- `musician` — customer;
- `provider_owner` — provider organization owner;
- `provider_manager` — provider manager;
- `provider_staff` — ordinary provider staff;
- `support_agent` — customer support;
- `trust_safety` — claims, verification and marketplace integrity;
- `finance_admin` — settlements, fee/reconciliation and loyalty administration;
- `operations_admin` — cross-marketplace Operations;
- `corporate_admin` — senior corporate administration;
- `super_admin` — platform authority administration plus all operational permissions.

Provider access is additionally constrained to active organization membership (`owner`, `manager`, `staff`). A provider role never grants access to every studio.

Corporate access is deny-by-default and permission-based. Finance, Support and Trust & Safety do not automatically inherit the general Operations console. `/registry-admin` requires the combined Operations permission set. Only `super_admin` can call the server endpoint that grants/revokes platform roles.

The private ChatGPT Sites preview can still use explicit environment email lists to exercise office roles. That fallback is restricted to `chatgpt_demo` identities; production Supabase identities cannot acquire Operations authority from the old `SESSIONS_ADMIN_EMAILS` compatibility list.

## Customer marketplace

The production customer domain supports sourced discovery and real provider participation. Real booking requests use provider-owned room inventory, server-side pricing, global availability and D1 persistence.

The optional `/demo` sandbox continues to exercise a richer fictional end-to-end customer transaction UI while production inventory is being onboarded. It includes:

1. structured rehearsal search by area/date/time/duration/group/equipment/budget;
2. deterministic natural-language requirement extraction into visible editable filters;
3. room comparison and detailed equipment/access information;
4. valid-slot selection with opening hours, blocks, existing bookings, minimum duration and reset buffers;
5. recurring-session validation;
6. provider subtotal, configurable fee, deposit and total separation;
7. instant-versus-provider-approval states;
8. booking reference, receipt/calendar/share/cancellation/rebooking controls;
9. completed-booking reviews.

Sandbox data is clearly fictional/sample inventory and must never be presented as verified real business inventory.

## Provider system

The production provider surface is `/manage`, backed by the real registry/provider domain rather than the old standalone demo portal. It supports the provider lifecycle around ownership/registration, studio and room configuration, prices, equipment, public hours, room capacity, map/entrance data, availability, staff, booking management, settlement records and subscriptions/integration gates.

Authorization is tenant-scoped. Owners, managers and staff are distinct roles; management actions are not inferred merely from knowing a studio ID or opening the provider URL.

## Corporate system

`/corporate` is the Sessions control plane. It resolves the signed-in account’s trusted roles and permissions, then exposes only the office responsibilities assigned to that account.

Current corporate domains include:

- Provider Operations — registrations, provider readiness and marketplace onboarding;
- Trust & Safety — ownership claims, verification and marketplace integrity;
- Finance — settlements, invoices, fee governance and reconciliation;
- Customer Support — service issues and notification health;
- Super Administration — platform-role assignment.

The broad `/registry-admin` console remains reserved for accounts with the full Operations permission combination. Dedicated mutation queues for Finance, Support and Trust & Safety are intentionally being separated rather than giving every corporate user broad Operations power.

## Booking integrity and money

Money uses integer cents. USD is the enabled currency. ZiG support remains an architectural capability only until real rail, denomination/FX and reconciliation rules exist.

Production booking/settlement code enforces server pricing, ownership/participant access, idempotency and auditable state. Existing booking/settlement snapshots are not silently repriced when future fee policy changes.

Provider price sovereignty remains a core rule: providers control their own room rates, while Sessions platform fees are separately governed and snapshotted.

## Search and AI boundary

The deterministic rehearsal interpreter recognizes common music requirements such as neighbourhood, group size, day/time, duration, budget, drums, PA, microphones, amps, keyboards/piano, music stands, backup power, parking, accessibility, verification, cancellation preference and instant-versus-approval booking.

Interpreted requirements are always visible/editable. AI must never invent availability, pricing, equipment or provider verification. Any live model remains a structured interpretation layer over authoritative marketplace data.

## Integration state

- **Database/storage:** D1/R2 are active and authoritative for product data/media metadata.
- **Identity:** Supabase production schema and application integration are implemented in source, but the latest authority migration must be applied to the dedicated Sessions Supabase project and its runtime keys must be configured before production identity is considered live.
- **Payments:** payment/settlement architecture and subscription provider adapters exist; live marketplace payment credentials, webhooks, refund/payout procedures and launch gates still require production configuration/certification.
- **Maps:** sourced/provider coordinates follow evidence and owner-controlled entrance-pin rules; fictional sandbox inventory does not fabricate precise real-world business locations.
- **Notifications:** in-app records exist; external email/scheduler delivery remains credential/consent dependent.
- **Calendar:** integration contracts exist; production provider credentials remain a launch gate.
- **AI:** deterministic search works without a model; live AI remains optional and constrained.

## Validation

GitHub Actions runs `npm test` on every push to `main`. That command performs the production build and then the complete Node test suite.

Coverage includes authentication, Origin enforcement, server pricing, booking idempotency, inventory conflicts/reset buffers, recurring rollback, provider blocks, account and tenant isolation, real registry/claim/verification workflows, provider staff permissions, global studio bookings, settlement lifecycle, messaging/notifications, media privacy, subscription/billing contracts, Supabase identity behavior, corporate permission separation, super-admin restrictions and production route unification.

A green CI build is not a substitute for physical-device UAT or live-provider certification. ChatGPT Sites deployment synchronization, the correct Sessions Supabase migration/secrets, real payment/provider credentials, real venue/equipment verification, scheduler activation, load testing and operational settlement/dispute procedures remain deployment/launch checks rather than facts to infer from source code.

## Environment and deployment

`.openai/hosting.json` declares the logical D1 `DB` and R2 `BUCKET` resources used by the Sites runtime. `.env.example` documents identity modes, private preview office lists and external integration gates. Secrets and real customer/provider private data must never be committed.

The authority migration is `supabase/migrations/202609110001_platform_authority_hierarchy.sql`. Apply it only to the dedicated Sessions Supabase project. Do not apply it to an unrelated connected Supabase project.

## Further documentation

- [`docs/PRODUCT-BRIEF.txt`](docs/PRODUCT-BRIEF.txt) — governing product specification.
- [`docs/AUTHORITY-AND-UNIFICATION.md`](docs/AUTHORITY-AND-UNIFICATION.md) — current production authority and route/data architecture.
- [`docs/TAKEOVER-2026-09-11.md`](docs/TAKEOVER-2026-09-11.md) — customer rebuild history and previous gap record.
- [`docs/UX-AUDIT.md`](docs/UX-AUDIT.md) — competitive/design interpretation.
- [`docs/REGISTRY-IMPLEMENTATION.md`](docs/REGISTRY-IMPLEMENTATION.md) — sourced registry and claim workflow.
- [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) — integration/launch guide.
- [`docs/PRODUCTION-ROADMAP.md`](docs/PRODUCTION-ROADMAP.md) — production migration boundary.

Run the same gate as CI before shipping: `npm test`.
