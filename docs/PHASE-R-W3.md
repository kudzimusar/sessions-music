# Phase R Workstream 3 — configurable fee policy and add-on pricing

## What shipped

- An effective-dated D1 fee-policy registry. A policy can apply globally or override one studio room.
- The payer (`musician`, `studio` or `split`) and fee basis (`room_subtotal` or `room_plus_addons`) are data, never a source-code constant.
- The permanent fallback is the explicitly labelled **founding-studio pilot at 0%**. It is not a commercial decision and cannot be retired.
- Room owners can manage deposits and a bounded catalog of add-ons. Each add-on carries an `available` and a `commissionable` flag.
- Quotes and booking requests calculate all amounts on the server. Clients submit only room, duration and add-on quantities; no client total is accepted.
- A booking stores its room/add-on lines, integer-cent pricing and policy snapshot. Confirmation reuses that snapshot for the W2 settlement ledger, even if a later policy changes.
- Operations has a fee-policy screen with an effective-date overlap guard and retirement action. The control is role-protected server-side.

## Commercial posture

No payment gateway, FX, ZiG, promotion, paywall or subscription price is enabled by this workstream. Sessions still uses the W2 concierge flow: the musician pays the studio directly and the studio confirms settlement. A studio fee, if configured later, is only accounted for in the ledger; it does not cause Sessions to hold money.

## Security and state guarantees

- Integer cents only; fee rates are integer basis points and constrained to 0–25% per payer side.
- Operations role, same-origin requests, bounded payloads, opaque idempotency keys and revision checks protect policy changes.
- A policy cannot overlap another active policy with the same scope/target.
- Room override beats global policy. In `room_plus_addons`, only explicitly commissionable add-ons enter the fee basis; all selected add-ons remain part of the direct customer total.
- The release adds both migration `0010_dazzling_black_queen.sql` and the corresponding typed schema declarations. No Supabase database table is created or moved.

## Mobile QA checklist

- [x] Add-on controls have 36px minimum touch targets on small screens.
- [x] Quote rows wrap without hiding total, deposit or studio-fee wording.
- [x] Owner room editor supports deposit/add-ons without a horizontal-scrolling data table.
- [ ] Signed-in production booking was manually tested with a real verified room. This cannot be completed until a studio has passed W1 verification and is intentionally not simulated on `/demo`.

## Certification

- `npm test` — 102 passing tests, including positive/negative policy endpoint, overlap, quote and immutable-snapshot coverage.
- `npx tsc --noEmit --incremental false` — clean.
- Production build and rendered route checks — clean.
- Privately deployed to the owner-only Sessions site on 3 September 2026. `/demo` remains private and unchanged.
