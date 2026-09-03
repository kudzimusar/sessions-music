# Phase R Workstream 3b — recurring sessions and retention evidence

## What shipped

- A weekly-series booking request supports two to twelve sessions. Every date is validated on the server before any row is written; a D1 batch writes the series, bookings and inventory slots together, or writes none of them.
- A series has an opaque idempotency key and preserves each date's independently calculated membership price, add-ons and fee-policy snapshot. A later policy change cannot rewrite a scheduled series.
- Existing studio memberships now have an auditable D1 ledger. A paid plan records the owner-confirmed off-platform settlement method; a completed booking linked to a membership records attendance.
- Platform loyalty credit has a versioned D1 setting, defaults to disabled and is controlled only by Operations. When enabled, a completed platform booking credits the customer at that studio only.
- Credit redemption is server-authoritative: a balance is reserved atomically when an individual booking request is created, cannot be spent twice, and is restored automatically when that request is declined or cancelled. Weekly series deliberately do not reserve credit, keeping their multi-date quote and reversal semantics unambiguous.
- Studio membership management shows settlement and attendance activity. Booking on a phone can select a weekly repeat cadence and, where the Operations policy is enabled, use a studio-specific earned credit.

## Financial and trust boundary

Membership fees and loyalty credit are not a payment rail. The studio records direct settlement only after it has actually received the money. Sessions does not debit a member, issue a payout, hold a deposit or claim that an offline payment is gateway-verified.

## Security and state guarantees

- Customer, studio and Operations scopes are enforced server-side; another customer cannot cancel or inspect another customer's record.
- All money-like values remain integer cents. Loyalty balance changes are guarded in the same atomic D1 transaction as the booking or booking-status transition.
- A stale Operations setting revision fails closed. Replaying a loyalty-settings request or a weekly-series request returns the original result rather than creating duplicate ledger rows or bookings.
- Attendance is emitted only after a studio-managed completed booking with a recorded direct settlement. A membership term or loyalty balance cannot grant staff access or displace a confirmed booking.

## Certification

- `tests/retention.test.mjs` covers missing identity, wrong role, hostile origin, stale settings, duplicate actions, cross-customer cancellation, atomic weekly-series rollback, off-platform membership settlement, attendance, credit earning, redemption and reversal.
- Full certification and private deployment are recorded with the release checkpoint after the workstream's final build.

## Mobile QA checklist

- [x] Weekly cadence is a native accessible select with a maximum of twelve sessions.
- [x] The all-or-nothing warning is visible before submitting a series.
- [x] Credit control is hidden until Operations enables it and is disabled for a weekly series.
- [ ] Signed-in production booking is manually tested on a physical phone after a real studio reaches `bookable`; no fictional listing or `/demo` flow is used for this check.
