# Harare registry expansion

Implemented 31 August 2026. The real studio registry is the default home page; the earlier ten fictional venues and simulated payments are preserved at `/demo`, with the existing provider and operations sandboxes unchanged. No fictional room, photograph, rate or review is attached to a real business.

## Product flow

1. Public-source studio profile, initially unclaimed, without invented availability or prices.
2. Authenticated representative submits a private claim with a business role, contact, evidence description and explicit authority declaration.
3. Configured registry operator independently checks ownership authority and records an approval or rejection. Claim approval creates only a `claimed` workspace; it never creates a verified badge or booking access.
4. Owner submits separate business/operating evidence, optionally including a private R2 image. A different Operations reviewer moves the studio to `verified` only after independent business and premises checks.
5. Successful owner completes address, confirmed map coordinates, services, equipment/accessibility notes, booking terms and rooms. Each room has a rate, capacity, public weekdays/hours, minimum duration, reset buffer and up to five owner-supplied R2 photos.
6. A verified owner enables booking requests, moving the studio to `bookable`. Customers see a server-calculated studio price; requests hold room inventory until accepted, declined or cancelled. No online payment is collected.
7. Owner invites team members by exact verified Zimbabwe phone number or email. No invitation is sent externally. The person signs in at `/account`, accepts membership and controls their public name, title, biography and skills. Invite contacts remain private.
7. Accepted managers can manage bookings; ordinary staff can manage only their personal profile. The owner alone edits studio settings and memberships. Revocation removes access and public staff visibility immediately.

## Routes

| Route | Purpose |
| --- | --- |
| `/`, `/studios` | Real Harare studio search by name, services, area or public staff |
| `/mobile` | Explicit phone UI, also applied automatically to narrow screens |
| `/map` | Searchable studio list with selected studio map search |
| `/studio/:id` | Sourced profile, contacts, team, map, claim and booking request |
| `/manage`, `/manage/:id` | Studio-specific booking calendar, profile, rooms and team |
| `/requests` | Customer booking requests and cancellation |
| `/account` | Claims, phone/email-bound team invitations, self-managed staff profiles and device controls |
| `/registry-admin` | Ownership review, registry additions/corrections, removal reports, invitation drafts |
| `/demo` | Original isolated rehearsal booking and payment simulation |

The phone UI uses safe-area-aware bottom navigation, responsive cards/forms, larger touch targets, sticky actions and a standalone web manifest with shortcuts. Explicit phone view persists for this browser tab until Desktop view is selected. It is a web app, not an iOS/Android native binary. No offline cache, push notifications, background location or app-store distribution is implemented.

## Research and provenance

Initial scope is 12 sourced profiles, not a census of every studio in Harare. Exact sources, source types and dates are stored in `lib/registry.ts` and displayed on every studio. Research used publicly accessible official sites, official business social profiles, and public directory snippets. No account-gated content, hidden contacts, paywalled datasets, personal staff records or photographs were copied. Some social/web pages expose only indexed public text; those details remain unconfirmed until a studio claims its listing.

| Listing | Source basis | Location limitation |
| --- | --- | --- |
| OneVibe Studiox | Official contact page and SoundBetter business profile | Dolphin House room 707; no verified coordinate pin |
| SoundLab Rehearsal Studio | Official Instagram/Facebook business pages | Dolphin House room 714; distinct from OneVibe |
| Kulcha Houz Studio B | Official site and OneVibe third-party guide | Lawley Avenue branch from third-party guide |
| Bridgenorth Studios | Miloco studio introduction, map and contact pages | Bridgenorth Road, Greendale; Miloco booking contact |
| Monolio Studios | Producer's official YouTube and ReverbNation profile | Harare only; no exact address asserted |
| JP Studios | Official business Facebook page | Source address needs reconfirmation |
| Zimbabwe College of Music | Official contact page and college studio announcement | C3 Civic Centre, Rotten Row; public hire not assumed |
| Chillspot Recordz | Public business listing and official artist/studio page | Mbare only; unconfirmed flat address deliberately omitted |
| Spirit Media | Official website and contacts | Harare only |
| Metro Studios / Metro Systems | Public business directories | Msasa address and operation may be stale |
| Loft Events & Studios | Official rehearsal announcement | Avenues cross streets; entrance unconfirmed |
| ZNFPC Audio Visual Unit | Official institution page | Southerton; production facility, rehearsal hire not established |

Excluded: Last Power Media, whose directory listing conflicts with closure reporting; NashTV studios, where closure reporting requires fresh confirmation. Kenako and other leads were not included merely from old references. A commercial aggregator's claimed citywide studio count was not treated as an authoritative census or copied as a paid dataset.

Map view uses Google Maps search embeds and outward search links for every listing. A search resolution is not a verified entrance and is labelled accordingly. No made-up coordinates are used. Claimed owners can supply entrance coordinates, which are labelled owner-supplied. External map loading depends on the user's network and Google's service; source addresses and outward map links remain available.

No outreach has been sent. Registry operations can copy a personalised claim-invitation draft. Operator must review and send it separately if desired. Site sharing remains unchanged (private); external studios cannot participate until the owner intentionally grants appropriate access or approves public access.

## Data and authorization

D1 tables: `studio_registry`, `studio_claim_requests`, `studio_staff`, `studio_bookings`, `studio_booking_slots`, `studio_issues`, `studio_audit`. They are distinct from the account-isolated demo tables. Migration 0002 is additive; migrations 0000 and 0001 are untouched.

Private preview identity comes from Sites-forwarded ChatGPT headers. Production identity comes from a verified Supabase bearer token plus the RLS identity context; neither trusts request JSON or user metadata for roles. Registry operators are a server role (with the legacy allowlist retained only for private preview). Owner access requires approved D1 ownership and an active matching Supabase organization membership; managers require an accepted D1 invitation and the matching active membership. Claim and issue queues are scoped to the current applicant/reporter or operator; customer/booking/contact data is scoped to customer or authorised studio managers. Public availability returns only occupancy intervals, not customer identity or notes.

Each studio mutation uses a D1 atomic batch with an optimistic revision guard and immutable audit event. Unique studio/room/date/half-hour slot keys protect reservations across all accounts and include the room reset buffer. Booking request keys make retries idempotent. Pending invitation and claimant quotas limit accidental queue flooding; full production abuse controls and notification delivery remain future work.

Changing the sourced address via operations clears the owner pin and disables requests until reconfirmed. Existing booking records remain intact. Hiding a listing removes discovery and stops new requests without silently cancelling existing bookings. Source corrections never change ownership or team access.

## Verification

- TypeScript check.
- Registry tests execute the actual API handler against a SQLite-backed D1 adapter: claim escalation, independent ownership and verification reviewers, blocked self-review, private evidence/media, scope checks, phone/email-bound staff consent, manager activation/revocation, server prices, idempotency, concurrent booking exclusion, reset buffers, cancellation, private suggestions and audit events.
- Original demo booking-engine tests retained.
- Built Worker tests exercise SSR for real directory, phone view, map, studio detail and preserved demo; apply all D1 migrations and verify the registry/API in Miniflare.
- One bounded browser pass confirmed the dedicated phone layout and name filtering. The preview registry API was unavailable, so authenticated interactive flows were verified with API/Worker tests rather than claimed as browser-tested. A real physical iOS/Android device pass and live external map resolution were not performed.
