# Phase R — Workstream 2 release evidence

Status: code-complete and certified for the owner-only Sites release. D1/R2 remain the product system of record. No gateway call, custody, payout or automatic refund is part of this workstream.

## Delivered

- A one-to-one settlement record is created atomically when a real registry booking is confirmed.
- Pricing is server-owned integer cents and carries an immutable fee-policy snapshot. The current record is the visible founding-studio pilot at 0%; Workstream 3 replaces policy selection, not old snapshots.
- Settlement state machine: `awaiting_payment → proof_submitted → payment_declined | settled_off_platform`, plus `disputed` and `cancelled` controls.
- Customer payment proof is private R2 media scoped to the exact booking. Only the customer, studio owner/manager and Operations can read it.
- Only the studio owner or an accepted manager can acknowledge or decline payment. Operations can inspect and resolve record disputes but cannot impersonate studio confirmation.
- Completed bookings require a studio-confirmed `settled_off_platform` record. A paid booking cannot be silently cancelled.
- Stale revision guards and actor-scoped idempotency keys protect every settlement mutation.
- Monthly statement UI in the phone-ready studio console with authenticated CSV and PDF downloads.
- Prior months can be closed into one immutable invoice record containing the exact settlement IDs and issued totals.
- Operations sees awaiting, declined and disputed settlements without treating those records as proof that money is owed.

## Arithmetic contract

All values are integer USD cents.

| Value | Invariant |
| --- | --- |
| Gross | room subtotal + add-ons |
| Platform fee | customer fee + studio fee |
| Customer total | gross + customer fee |
| Studio net | gross − studio fee |
| Deposit due | part of, never greater than, customer total |

The initial W2 snapshot has no add-ons, deposit or fee. The schema already separates every component so W3 can introduce effective-dated musician, studio or split policies without rewriting a settled record.

## D1/R2 changes

- `drizzle/0009_wise_iron_lad.sql`
  - `studio_settlements`
  - `settlement_events`
  - `studio_invoices`
  - private payment-proof linkage on `uploads`
- R2 objects remain private unless a public room profile explicitly references them. Payment proof can never become public profile media.

All changes are additive. Existing migrations were not rewritten.

## Negative-path evidence

- missing identity: rejected;
- hostile origin: rejected by mutating routes;
- unrelated customer/studio: rejected;
- ordinary musician and Operations reviewer: cannot confirm a studio payment;
- cross-studio settlement ID: not disclosed;
- stale revision: rejected;
- repeated idempotency key: returns the original result without a second event;
- proof owned by another booking/customer: rejected;
- paid booking cancellation: blocked pending dispute resolution;
- statement export by an unrelated account: rejected.

## Explicitly not claimed

- Sessions does not receive, hold, transfer or refund the customer’s money.
- A customer screenshot is not labelled paid until the studio acknowledges it.
- A statement is an operational ledger, not a bank statement or tax opinion.
- No Paynow, Stripe, PayPal, ZiG/FX, payout, chargeback or automatic commission collection is active.
- Refund decisions and reversing an off-platform transfer remain manual and require a later written policy.

## Mobile QA checklist

- [ ] 360 × 800 Android: payment-proof file picker, keyboard, method choice, error and replacement-proof flow.
- [ ] 390 × 844 iPhone: private proof open, studio acknowledgement, decline reason and dispute dialog.
- [ ] Studio phone: Bookings → confirm direct payment → complete session → Statements → CSV/PDF.
- [ ] Operations phone: awaiting/declined/disputed queue, proof access and independent dispute resolution.
- [ ] Confirm `/demo` remains private and its simulated gateway never appears in real registry settlement screens.

Physical-device items remain unchecked until production identity credentials are available. Automated gate: standalone TypeScript clean, production build green and 98/98 tests passing.
