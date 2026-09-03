# Phase R Workstream 4 — booking proof and communication

## What shipped

- A studio acceptance now creates one active, server-issued booking voucher. It contains only a booking reference, studio, room, date and time; it never represents payment, admission or a live availability check. Cancelling the booking revokes the voucher instead of leaving a misleading public artifact.
- Confirmed participants can download a minimal Harare-time `.ics` file, copy or natively share the voucher link, and scan a generated QR code that resolves to the same voucher. Neither the calendar file nor the public voucher includes the musician's phone number, note or payment details.
- The service worker stores only the authenticated musician's own confirmed/completed booking references on that device. The cached payload carries an explicit offline disclaimer and is cleared after sign-out; it is never a cached reservation, payment record or source of truth.
- Each active booking has a server-scoped inbox for the musician and the studio owner/manager group. Messages, read state and unread counts are recorded in D1. Optional image attachments remain private R2 media and are authorized against the same booking before upload or read.
- WhatsApp is a user-triggered `wa.me` deep link only. Sessions creates an audit/notification record that the link was opened, but does not send a message, contact a WhatsApp API or expose an unconfigured communication integration.
- Booking, settlement, message and reminder updates are in-app notification records. The notification preference endpoint requires an authenticated user, same-origin request, fresh revision and opaque idempotency key.
- A scheduled Worker handler invokes a bounded, idempotent 24-hour / 2-hour reminder processor. In-app reminders are always recorded once per booking side. Email has a separate explicit consent and remains invisible and inactive unless all `EMAIL_PROVIDER_*` runtime values are configured.

## Security and state guarantees

- Calendar, offline-reference, message, WhatsApp-link and image requests all derive the participant from the server session. Operations may review operational records but cannot browse a private booking thread.
- Message sends, preference changes, settlement notices and reminders use database uniqueness/idempotency keys. Replaying an action returns or preserves the original record; a second direct-payment proof can create a distinct later notification without corrupting the original event.
- All new persistent data is in the appended D1 migration `0012_w4_booking_communications.sql`. D1/R2 remain the product system of record; Supabase remains identity-only.
- `/demo` is unchanged. Its simulated payment route is not used by real registry vouchers, settlement or communication routes.

## Reminder activation boundary

The Worker has the scheduled-event handler and the processor has deterministic tests. The current Sites runtime manifest does not declare a schedule trigger, so no live reminder schedule is claimed yet. Before enabling reminders for real studios, configure a trusted platform scheduler/Cron trigger to invoke the Worker at least every 10–12 minutes, then set `EMAIL_PROVIDER_ENABLED=true` only after the relay endpoint, token, sender identity and recorded participant consent have been reviewed. In-app records remain safe if the handler runs more than once.

## Certification

- `tests/booking-communications.test.mjs` covers missing identity, wrong participant, Operations thread denial, cross-origin rejection, duplicate message/preference actions, private calendar/offline data, unconfigured email, idempotent reminders and voucher revocation.
- Existing settlement tests cover a replacement proof after a declined proof; the notification idempotency key preserves both distinct state changes.
- The complete suite has 112 passing tests, the standalone typecheck is clean and the production build succeeds.

## Mobile QA checklist

- [x] QR, calendar, copy and native-share controls have visible labels and compact phone layout.
- [x] The inbox has semantic form controls, keyboard-safe text area sizing, lazy image attachments and 44px phone actions.
- [x] Offline copy states precisely that the device copy cannot prove a current reservation or payment.
- [x] Unconfigured email controls are not rendered.
- [ ] Signed-in physical-phone test with a real `bookable` studio and a deployed scheduler remains required before public launch.
