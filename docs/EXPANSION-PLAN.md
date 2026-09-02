# Sessions: discovery, membership and billing expansion

The directory is the foundation. Public listings are leads, not contracted partners; ownership review remains mandatory. Research checked 31 August 2026. Unknown capacities, street numbers, prices and coordinates must remain unknown.

## Product decisions

1. **Near me:** explicit, one-time browser location permission; local straight-line distance and radius filtering. Owner-confirmed entrances take precedence over clearly labelled public-source building, campus or street points. Users can exclude approximations. Profiles with no researched coordinates remain available through name/area and external map search. Never invent distances or persist a visitor's location.
2. **Planning:** a structured session planner filters actual published room prices, capacity, availability and current membership benefits. Optional OpenAI Responses integration interprets plain language, without seeing account details or precise location. Every proposal requires review and a separate booking submission. Guided search remains available when AI is not configured.
3. **Budget:** USD total session budget, duration and group size are explicit; show the price calculation and exclude unknown prices from confirmed budget matches. Discounts are computed on the server.
4. **Studio loyalty:** owners publish plans with a fee, term, discount and priority-review benefit. Customers request membership; verified owners confirm free or externally settled memberships. No automatic debit, guaranteed slot, queue jumping over accepted bookings, or staff permission is implied. Existing benefits are snapshotted for the agreed term.
5. **Capacity and address:** each profile shows owner-confirmed room capacities or a clear missing-data state. Full visitor addresses and entrance pins form part of owner onboarding. Do not mistake a building's floor area for its safe occupancy.
6. **Registration:** search and claim an existing record first. Missing studios submit a private registration; an independent operator reviews public evidence and authority before creating an owner-managed listing. The same authenticated account manages multiple studios; each has its own dashboard, team and checklist.
7. **Subscriptions:** platform subscriptions are separate from studio memberships. Free registry/claim and existing booking functions remain available. Stripe/PayPal are recurring subscription adapters; Paynow is a prepaid term with manual renewal. Provider credentials, an approved price, merchant eligibility, return origin and webhook configuration are required before checkout is offered. No marketplace payouts or connected studio merchant accounts are created.

## Activation boundaries

- OpenAI credentials are absent. The AI adapter must report this, and never label deterministic fallback output as AI-generated.
- Stripe's connected Tengasell account has both test and live modes. The account/mode question was unanswered. No products, prices, charges or account changes are authorised by that unanswered choice.
- PayPal and Paynow merchant credentials are absent. Their country/account capabilities must be checked before live activation; Paynow test transactions require a separate go-live review.
- Prices are not invented. Subscription price and provider plan identifiers are server configuration, not browser input.
- No automatic outreach, emails or push messages are sent.

## Sources and limits

- OpenAI Responses structured output: https://developers.openai.com/api/docs/guides/structured-outputs and https://developers.openai.com/api/docs/guides/migrate-to-responses
- Stripe hosted subscriptions: https://docs.stripe.com/billing/subscriptions/build-subscriptions?payment-ui=checkout&ui=stripe-hosted
- Stripe merchant eligibility: https://stripe.com/global
- PayPal subscriptions: https://developer.paypal.com/docs/subscriptions/integrate/
- Paynow integration and test/live review: https://developers.paynow.co.zw/docs/paynow/integration_generation/ and https://developers.paynow.co.zw/docs/paynow/test_mode/
- Existing registry sources remain attached to individual profiles. Follow-up searches did not establish safe, complete visitor addresses for Monolio or Spirit Media. Bridgenorth's representative still lists Bridgenorth Road without a street number. Its public map short link was resolved to a street coordinate; it is labelled as such, never as a studio entrance.

## Verification scope

Test authorisation, registration review, membership privacy and lifecycle, term expiry, server pricing, booking conflicts, planner constraints, missing configuration, provider-signature rejection and checkout ownership. Build through the Sites lifecycle checkpoint and deploy the exact validated version. Live model calls and merchant transactions cannot be verified without the missing configuration.

## Implemented milestone

Near-me and capacity/budget filters, guided and optional AI planning, request prefill, studio membership plans and approvals, discounted server quotes, registration review, onboarding checklist and platform subscription adapters are implemented. Nineteen additional isolated tests exercise these flows, including provider test doubles. The original 36 booking and registry handler tests still pass.

The bounded browser pass inspected the dedicated phone layout and planner, and checked budget filtering and navigation. No overflow was observed in the phone-view canvas. The preview registry API remained unavailable (503), so authenticated live browser flows were not verified there; the built Worker tests apply all migrations and exercise D1 separately. This was not a physical-device test. No browser location permission or real merchant checkout was used.

## Completion audit and corrective patch — 31 August 2026

The milestone above was not completion of all eight user requirements. In particular, a disconnected adapter is not working AI or an activated gateway; deterministic planning is not AI; an empty location registry does not deliver useful near-me matches. Automated provider stubs are not merchant sandbox or live end-to-end verification.

This corrective patch adds four sourced approximate points: the shared Dolphin House building for OneVibe and SoundLab, a public campus point for Zimbabwe College of Music, and the representative-linked Bridgenorth Road point. These are stored separately from owner-confirmed entrances. Address changes invalidate public geometry; seed enrichment is bounded and idempotent and preserves owned records and corrected addresses. Eight seed listings still have no researched coordinates. Near-me tests now run against actual seeded data, not only synthetic pins.

- Dolphin House coordinate source: https://skyscraperpage.com/forum/showthread.php?p=10620319 (building, not room entrance). Cross-check: https://www.scribd.com/document/719926290/1030-Geolocations-Update lists a public business in the same building within a few metres. Only the building coordinate is used, not unrelated business/customer records.
- College campus coordinate: public Waze Place structured data at https://www.waze.com/live-map/directions/college-of-music-harare?to=place.w.20317782.203439961.3805353 ; college visitor address corroborated at https://zcm.co.zw/contact-us/ . Public recording-room access remains unconfirmed.
- Bridgenorth representative: https://milocostudios.com/studios/bridgenorth-studios/location-and-map/ links to https://maps.app.goo.gl/rgp36y8jXyY3hsUh9 ; resolved place is Bridgenorth Road, not a numbered studio property.
- Kulcha Houz's own public profile corroborates 47 Lawley Avenue, Belvedere, Harare: https://www.facebook.com/p/Kulcha-Houz-Studio-100068628488954/ . No unsupported postal code or capacity is added.

The planner now warns upfront when no studios have published bookable rooms. Registry operators have an eight-requirement launch checklist showing data coverage and integration configuration. Configuration status is not a certification of provider operation.

Outstanding: OpenAI account/model configuration and real calls; per-studio capacities, prices and calendars supplied by owners; unresolved full addresses and map pins; approved merchant accounts/prices, production callbacks and provider sandbox verification; online studio-membership checkout and studio fund-routing design. Platform subscriptions do not satisfy online studio membership billing. ChatGPT-based sign-in and ownership workflows exist, but independent email/password authentication and authenticated browser end-to-end testing have not been delivered.

The Sites access policy was restored to owner-only custom access on 2 September 2026, with zero external visitors. Public publication remains blocked until the production identity, communication and sandbox-payment gates pass. This does not activate payments.

Sharing metadata now uses each public studio's current name and description and clears inherited generic imagery. Hidden records are excluded from server-rendered detail previews. The site-wide `public/og.png` is an AI-generated branded conceptual graphic, not a photograph of a named studio. Built-in image generation prompt: "Sessions" / "Find your sound. Find your space." / "Harare, Zimbabwe"; deep blue, white and muted teal, editorial sans-serif, subtle audio-line motif and microphone detail; no real business logos, named studios, or claims that AI, bookings or payments are live.
