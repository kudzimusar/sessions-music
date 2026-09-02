# Sessions integration and launch guide

## Current release

All studio records remain source-backed and unclaimed until independent review. The real registry has no fabricated prices, capacities or entrance coordinates. Search by name, area, full published address, service or consenting staff; apply known-capacity and total-session budget filters. Near-me asks for device location only when clicked and calculates straight-line distances locally. Four seed profiles have sourced approximate building, campus or street points; eight have no researched coordinates. Approximate locations can be excluded. None of these public-source points is an owner-confirmed entrance. Address changes invalidate public geometry, and owner-confirmed coordinates take precedence.

The guided planner requires no AI subscription, but it cannot produce bookable results until owners publish room prices, capacities and calendars. It checks group capacity, opening hours, minimum duration, occupied time and reset buffers. It carries selected results to the studio booking form. A user must review terms and submit separately; the booking endpoint rechecks availability and calculates the final price. It is explicitly not AI. The registry operator's Launch checklist reports all eight requirements, registry coverage and integration configuration without claiming configuration proves successful operation.

## Studio registration, login and memberships

- `/register`: search first, then submit a missing business for independent review. `/registry-admin` includes the private registration queue. A reviewer cannot approve their own registration or ownership claim. Approval creates a claimed listing with bookings off.
- Login uses the existing trusted ChatGPT identity, never a client-selected owner or role. `/onboarding/:studioId` and `/manage/:studioId` belong to the verified owner. Accepted managers retain booking permissions only.
- Owners supply room capacity, contact/address, entrance coordinates, rates, hours and rules before opening bookings. The checklist links to profile, team, membership and subscription setup.
- Owners publish up to five membership plans with a fee in cents, term length, discount (0–50%), priority-review benefit and terms. Membership requests and names stay private to their customer and studio owner.
- Active terms snapshot the accepted plan. Benefits apply when the **session date** is within the inclusive term, not just when the request is made. Changing or withdrawing a plan does not rewrite an accepted term or an existing booking receipt.
- Paid loyalty membership fees are confirmed by the studio owner as **received outside Sessions**. This is not a gateway-verified receipt. No automatic debit, studio fund routing, payout or Connect account is created. Customer/owner termination requires confirmation; refunds are handled with the studio under its published terms.
- Priority means a badge and earlier placement in the pending review queue. It never displaces accepted bookings, grants staff permissions or guarantees availability.

## Source control, Supabase and platform calendar

### GitHub

The workspace is still backed by the private Sites Git remote. A GitHub Actions workflow is ready at `.github/workflows/ci.yml`; it runs the Node 22 verified build and complete test suite for pushes and pull requests to `main`. Create the approved private `kudzimusar/sessions-music` repository, then add it as a second remote and push `main`. Do not replace the Sites remote until both build paths have been verified, and never commit runtime secrets. The repository-wide lint command currently includes pre-existing violations and is intentionally not presented as a passing CI gate.

### Supabase

Do not point Sessions at the linked `Wewed` database. That is an unrelated production project, and its current public-schema audit reports 39 tables with RLS disabled. The user selected a different Supabase organization, so project creation is intentionally paused until that organization is connected. The planned project is `Sessions Music` in `eu-central-1` (Frankfurt).

Keep D1/R2 as the live system of record during the first migration stage. In the new Supabase project, add normalized Postgres tables, explicit least-privilege grants and RLS policies, test the policies, run both Supabase security and performance advisors, then dual-write and reconcile before changing reads. Never expose a secret/service-role key to the browser. See `supabase/README.md` for the staged handoff.

### Google Calendar · platform model

Confirmed, cancelled and completed registry bookings now queue an idempotent calendar sync. The Sessions booking is committed first, so a Google outage cannot roll it back. Failed writes are visible to owners/managers and can be retried. Calendar events use `Africa/Harare`, are private, send no invitations, and contain only the studio, room, time, group size and booking reference. Customer email, phone and notes are excluded.

Use a dedicated Google calendar named `Sessions Music Bookings`, not a personal or family calendar. Create a Google Cloud service account, enable the Calendar API, share the dedicated calendar with that service account using permission to change events, then add these values to secure Sites runtime configuration:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CALENDAR_ENABLED` | Set to `true` only after the dedicated calendar is shared and a test event succeeds |
| `GOOGLE_CALENDAR_ID` | ID of the dedicated platform calendar |
| `GOOGLE_CALENDAR_NAME` | Public admin label, normally `Sessions Music Bookings` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account that may edit only the dedicated calendar |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Secret PKCS#8 private key; never commit or expose to the client |

The authenticated ChatGPT Google Calendar connector is useful for operator checks but is not a production credential for the website. A service account keeps the integration server-to-server and scoped to one platform calendar.

## AI configuration

Use secure Sites runtime configuration, not source files or browser fields:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Secret server credential; never sent to the client |
| `OPENAI_MODEL` | Explicit model available to this account supporting Responses structured output |

The `/api/planner` AI path calls `https://api.openai.com/v1/responses` with a strict extraction schema, `store:false`, bounded output and a 25-second timeout. It sends only the user's consented text, not their identity, membership list, booking history or precise location. OpenAI still processes that text according to its API policies; `store:false` is not a promise of zero retention. Do not enter sensitive information. Ten AI attempts per signed-in account per CAT day are permitted. Usage counts are kept in D1; raw prompts and model responses are not retained by Sessions. Guided results are calculated, not labelled as AI output. No AI request creates a reservation or sends a message.

## Platform subscriptions

`/subscriptions` is a visible plan, gateway and billing-status page. Free claims, profiles and the existing booking tools remain available. The optional platform support subscription is separate from studio loyalty plans and room fees; this release does not hide features behind a paywall.

Checkout remains disabled until **all** required settings are valid. Stripe's connected Tengasell account exposes test and live modes, but no account/mode selection was provided in this task. No Stripe products, prices, credentials or account settings were created. No live AI call or merchant transaction has been executed.

### Common secure runtime configuration

| Variable | Required value / purpose |
| --- | --- |
| `BILLING_ENABLED` | `true` only after merchant setup and testing |
| `BILLING_MODE` | Explicit `test` or `live` |
| `BILLING_AMOUNT_CENTS` | Operator-approved price, integer USD cents from 100 to 100000 |
| `BILLING_ORIGIN` | Exact trusted HTTPS site origin, without an attacker-controlled forwarded host |
| `BILLING_MERCHANT_NAME` | Legal merchant displayed at checkout |
| `BILLING_SUPPORT_EMAIL` | Working merchant support contact |
| `BILLING_WEBHOOK_READY` | `true` only after provider callbacks can reach and validate against this deployment |
| `BILLING_LIVE_APPROVED` | Additional `true` gate for live mode, after country, tax, refund and merchant terms review |

The latest access check reports this site is public. Public access alone does not prove provider callbacks work. **Do not set the webhook-ready gate based on a local test alone.** Verify production callback reachability with actual provider sandbox events before activation. If access later becomes private, recheck callback and return navigation behaviour. Do not change access merely to bypass a payment integration gate.

### Stripe

Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; configuration: `STRIPE_PRICE_ID`. The key mode must match billing mode. Prefer a restricted key with only the required Checkout, price, subscription and portal operations. The configured price must be active, monthly, one interval, USD and exactly the server amount. Hosted Checkout uses `mode=subscription` and dynamic payment methods; card data never passes through Sessions. Stripe REST requests pin API version `2026-07-29.dahlia`.

Endpoint: `/api/billing/webhook/stripe`. Subscribe to checkout completion, subscription updates/deletion and invoice paid/payment failed events. Verify the raw-body HMAC and five-minute timestamp tolerance. Webhooks trigger a fresh server-side Checkout/subscription/invoice lookup; the invoice must be paid and match the expected price. Events are deduplicated only after successful reconciliation. A signed event alone is not payment proof. The customer portal provides cancellation/payment-management access scoped to the owner’s studio subscription. Configure the portal, cancellation terms and tax treatment in the merchant account before launch. This release adds no tax or fee on top of the configured price; the merchant must approve the appropriate inclusive-price treatment.

### PayPal

Secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`; configuration: `PAYPAL_PLAN_ID`, `PAYPAL_WEBHOOK_ID`. Test mode uses `api-m.sandbox.paypal.com`; live mode uses `api-m.paypal.com`. Country/account eligibility for receiving subscription payments must be verified with PayPal; a consumer-country page is not proof.

The plan must be active and contain one unlimited, monthly, fixed USD cycle matching the configured price, without a setup fee or additional percentage tax. Endpoint: `/api/billing/webhook/paypal`. Configure subscription lifecycle and sale completion events. Sessions validates events using PayPal's verification API and fetches the stored subscription directly. The custom reference, plan and last actual payment are checked before a paid term is recorded. Manage recurring agreements in the owner's authenticated PayPal account.

### Paynow

Secrets: `PAYNOW_INTEGRATION_ID`, `PAYNOW_INTEGRATION_KEY`; configuration: `PAYNOW_CURRENCY=USD`, `PAYNOW_MODE` matching common billing mode. Confirm the integration settles USD and which local payment methods it has enabled. The same Paynow endpoint serves the account's configured test/live integration; changing an app flag does not make Paynow live.

Endpoint: `/api/billing/webhook/paynow`. Initiation, callback and polling responses use the official SHA-512 hash procedure. Redirect/poll URLs are HTTPS and restricted to `www.paynow.co.zw`; the poll URL and integration key are never returned to the browser. Signed status must match the checkout reference and exact amount, and be `Paid` or `Delivered`. The first verified payment grants 30 days; retries do not extend that term. This is manual renewal, not tokenised recurring billing. Paynow's separate merchant go-live review remains required.

### Reliability and operational limits

- A server-owned UUID binds each checkout to one owner, studio, provider, price and mode. Repeating the same completed initiation returns the same checkout. A unique partial index prevents concurrent pending checkouts for a studio.
- A provider timeout may have created an upstream checkout. Such records stay in `creating` and block new attempts rather than risk duplicate billing. The operator must reconcile the reference against the provider before clearing it. Do not delete an uncertain checkout or start a second payment based only on an error screen. Automatic orphan recovery and a dedicated operator reconciliation UI are not included in this release.
- Canonical reconciliation is available through each owner's “Verify status” action. Forged return URL parameters never grant a paid term. Provider signature failures are rejected; transient reconciliation failures ask providers to retry.
- Optimistic database guards stop competing status updates and duplicate paid-term extensions. Late callbacks cannot replace a newer subscription with an older one.
- Test-mode records are visibly labelled. Mode changes do not reuse test provider objects as live objects.
- No automated dunning messages, refunds, disputes, marketplace commissions or studio payouts are implemented by these platform adapters. Enable and review merchant-provider operations separately before collecting real money.

## Schema and validation

New D1 tables: `studio_registrations`, `studio_members`, `planner_usage`, `billing_checkouts`, `billing_accounts`, `billing_events`. Existing studio JSON supports optional `memberPlans`; booking JSON stores base price, discount, membership reference and priority snapshots. Append migrations; do not rewrite the three earlier deployed migrations. The two expression-index statements in new migration 0005 use corrected SQLite syntax because drizzle-kit emitted invalid quoted expressions. Schema definitions and snapshot retain the intended expressions.

Meaningful tests exercise the actual route handlers with an isolated SQLite D1 adapter. Provider requests use test doubles and the Paynow documentation's public hash vector, never real credentials. These are not a substitute for sandbox merchant acceptance testing or a real smartphone trial.
