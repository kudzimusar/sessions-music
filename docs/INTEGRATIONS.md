# Sessions integration and launch guide

## Current release

All studio records remain source-backed and unclaimed until independent review. The real registry has no fabricated prices, capacities or entrance coordinates. Search by name, area, full published address, service or consenting staff; apply known-capacity and total-session budget filters. Near-me asks the browser for location only when clicked, calculates straight-line distances locally, and excludes unknown pins rather than inventing them. The twelve seed profiles currently have no owner-confirmed coordinates.

The guided planner is usable without an AI subscription. It checks published room prices, group capacity, opening hours, minimum duration, occupied time and reset buffers. It carries selected results to the studio booking form. A user must review terms and submit separately; the booking endpoint rechecks availability and calculates the final price.

## Studio registration, login and memberships

- `/register`: search first, then submit a missing business for independent review. `/registry-admin` includes the private registration queue. A reviewer cannot approve their own registration or ownership claim. Approval creates a claimed listing with bookings off.
- Login uses the existing trusted ChatGPT identity, never a client-selected owner or role. `/onboarding/:studioId` and `/manage/:studioId` belong to the verified owner. Accepted managers retain booking permissions only.
- Owners supply room capacity, contact/address, entrance coordinates, rates, hours and rules before opening bookings. The checklist links to profile, team, membership and subscription setup.
- Owners publish up to five membership plans with a fee in cents, term length, discount (0–50%), priority-review benefit and terms. Membership requests and names stay private to their customer and studio owner.
- Active terms snapshot the accepted plan. Benefits apply when the **session date** is within the inclusive term, not just when the request is made. Changing or withdrawing a plan does not rewrite an accepted term or an existing booking receipt.
- Paid loyalty membership fees are confirmed by the studio owner as **received outside Sessions**. This is not a gateway-verified receipt. No automatic debit, studio fund routing, payout or Connect account is created. Customer/owner termination requires confirmation; refunds are handled with the studio under its published terms.
- Priority means a badge and earlier placement in the pending review queue. It never displaces accepted bookings, grants staff permissions or guarantees availability.

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

This site is private. Its access gate may prevent provider webhooks or customer return navigation. **Do not set the webhook-ready gate based on a local test alone.** Resolve production callback reachability with an authorised deployment/access design before activation. Do not make the site public merely to bypass this gate.

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
