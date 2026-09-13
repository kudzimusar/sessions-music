# Phase 6 Provider Monetization Requirements

Status: REQUIREMENT CAPTURED — NOT IMPLEMENTED
Date: 13 September 2026
Phase boundary: Phase 6 has not started.

This requirement was captured during Version 18 Phase 1–5 UAT so it is not lost when Finance begins. It does not authorize payment, ranking, advertising or billing behavior in the Phase 5 runtime.

## Provider paid visibility and services

Sessions should support provider-funded commercial opportunities where a studio/provider can pay Sessions to promote legitimate services or inventory to marketplace customers.

Examples may include:

- featured studio placement;
- promoted rehearsal-room availability;
- promoted provider services such as recording, production, equipment hire or other provider-owned offerings;
- time-bounded campaigns or featured placement packages;
- provider-facing campaign status, budget, billing and performance reporting.

## Product and trust rules

Paid placement must never silently impersonate organic search relevance. Any paid placement shown to a customer must be clearly identifiable as sponsored, promoted or featured in the customer interface.

Organic discovery and paid promotion must remain separate concepts. Paying Sessions must not create provider verification, alter factual provider attributes, manufacture availability, overwrite provider pricing, bypass marketplace policy, or grant any provider/corporate authority.

The promoted object must reference the same canonical provider/studio/service/inventory records used elsewhere in Sessions. Mobile and desktop may compose promotion differently, but they must not maintain separate campaign truth or duplicate provider/service data.

## Finance and authority requirements

Implementation belongs to Phase 6 Finance and must use server-authoritative commercial state. At minimum:

- prices and charges are server-controlled and stored as integer money amounts;
- campaign order/payment state is durable and auditable;
- idempotency is required for purchases and billing mutations;
- provider tenancy is enforced on campaign creation and reporting;
- payment completion must be verified server-side rather than trusted from redirects/client state;
- refunds, cancellations, credits and campaign expiry must be explicit state transitions;
- historical campaign invoices/receipts must remain immutable;
- Sessions Corporate Finance can review commercial records only through existing permission/scoping rules;
- a provider payment must never grant staff roles, marketplace-wide authority or Corporate access.

## Search and disclosure requirements

When Phase 8 Search & Discovery v2 is implemented, paid placement must be integrated through an explicit disclosure/ranking contract rather than folded invisibly into organic scoring.

Customer UIs should be able to distinguish at least:

- organic/relevance-ranked result;
- sponsored/featured result;
- verified provider status;
- actual booking availability.

These signals must not be conflated.

## Surface requirements

Provider native mobile should support lightweight campaign visibility and essential status/notifications where useful. Provider desktop/PWA should host campaign configuration, service selection, budget/payment detail, reporting and advanced management.

Customer native and customer desktop/PWA must read the same promotion/campaign state and linked canonical provider resources while using surface-appropriate layout, motion and interaction.

## Explicit non-goal for Phase 1–5

Do not add a fake "boost", "featured", payment or sponsor control merely for visual completeness. Until Phase 6 implements the authoritative finance and campaign state, the production product must not imply that provider promotion can already be purchased.
