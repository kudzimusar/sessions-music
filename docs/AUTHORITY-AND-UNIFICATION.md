# Sessions production authority and unification

Updated: 11 September 2026

Sessions is one marketplace with multiple authenticated workspaces. Customer, provider and corporate views are not separate products and do not own separate production datasets.

## Product surfaces

| Surface | Production purpose | Authority |
|---|---|---|
| `/` and `/studios` | Public marketplace discovery from the sourced registry | Public read; private actions require identity |
| `/studio/:id` | Real studio profile and bookable inventory when a provider has completed the required setup | Public read; booking requires customer identity |
| `/requests` | Customer booking/request history | Signed-in customer, record scoped |
| `/account` | Identity, account and notification settings | Signed-in account |
| `/manage` | Provider organization/studio workspace | Owner/manager/staff capabilities scoped to active organization membership |
| `/corporate` | Sessions corporate control centre | Assigned corporate office role only |
| `/registry-admin` | General marketplace Operations console | Full Operations permission set only |
| `/demo` | Optional sample booking sandbox | Never the production marketplace; owner-only when production identity mode is enabled |

Legacy URLs converge into the production system: `/provider` redirects to `/manage`, `/admin` to `/corporate`, `/bookings` to `/requests`, and `/profile` to `/account`.

## Data authority

The production marketplace uses Cloudflare D1 and R2. The global production model includes the sourced studio registry, provider claims and verification, staff, real studio bookings, global slot claims, settlements, invoices, fee policy, recurring series, membership/loyalty records, booking messages, notification preferences and notifications. R2 stores authorized media bytes; D1 stores ownership and metadata.

The old per-user `workspaces`, `rooms`, `bookings`, `slot_claims` and `blocks` model is retained for the explicit `/demo` sandbox. It is not the target data model for production marketplace traffic.

Supabase is the production identity and tenant-authorization boundary. D1/R2 remain the product-data boundary. The server derives authority from a verified Supabase session and the `current_identity()` RPC rather than trusting a role submitted by the browser.

## Platform hierarchy

Sessions recognizes these platform roles:

- `musician` — base customer identity;
- `provider_owner` — provider organization owner;
- `provider_manager` — manager with booking/operational responsibilities for an assigned provider;
- `provider_staff` — ordinary provider staff;
- `support_agent` — customer support office;
- `trust_safety` — claims, verification and marketplace-integrity office;
- `finance_admin` — settlements, fee and loyalty/reconciliation office;
- `operations_admin` — cross-marketplace operational authority;
- `corporate_admin` — senior corporate operational authority;
- `super_admin` — platform authority administration plus all operational permissions.

Provider authority is additionally constrained by active organization membership (`owner`, `manager`, `staff`). A provider role never means access to every studio.

## Corporate permission model

Corporate authorization is deny-by-default and permission-based. The current permission vocabulary is:

- `platform:overview`
- `platform:roles.manage`
- `registry:read`
- `registry:write`
- `claims:review`
- `verification:review`
- `providers:oversight`
- `settlements:review`
- `fees:manage`
- `loyalty:manage`
- `support:read`

Finance, Support and Trust & Safety do not automatically inherit the general Operations console. `/registry-admin` requires the combined Operations permission set. `/corporate` can show permission-scoped aggregate metrics without exposing customer–studio private message content.

Only `super_admin` can call the platform role-assignment API. Role assignment is server-side and uses the Supabase secret key. The browser cannot promote itself. The base `musician` role remains lifecycle-managed rather than manually granted from this API.

## Preview versus production identity

The ChatGPT Sites preview can assign office roles from explicit environment email lists so the private preview can be exercised. That compatibility path is limited to `chatgpt_demo` identities. A production Supabase identity cannot become an operator merely because its email appears in the legacy `SESSIONS_ADMIN_EMAILS` list.

For production, platform roles belong in Supabase `platform_role_assignments`, provider tenancy belongs in `organization_memberships`, and the live `current_identity()` RPC returns the effective role/membership context.

## Implementation completed in source

- centralized platform role and permission matrix;
- fail-closed session capability endpoint;
- fail-closed protected-surface boundary;
- corporate control centre with permission-scoped metrics;
- full Operations gate on `/registry-admin`;
- super-admin-only server API for platform role assignment;
- distinct provider manager role preserved from Supabase through server authorization;
- legacy admin-email bypass restricted to ChatGPT preview identity;
- production URL convergence away from the old standalone provider/admin demo portals;
- additive Supabase migration for the expanded authority hierarchy and manager-preserving identity RPC;
- automated negative tests for customer escalation, office separation, provider tenancy, super-admin authority and legacy email bypass.

## External deployment gates still required

The migration in `supabase/migrations/202609110001_platform_authority_hierarchy.sql` must be applied to the dedicated Sessions Supabase project before these expanded roles exist in the live identity database. Do not apply it to another Supabase project.

The ChatGPT environment must then be configured with the Sessions Supabase URL, publishable key and server secret, and `SESSIONS_IDENTITY_MODE` must be switched to `supabase` only after live authentication tests pass. Phone/email/social provider configuration, CAPTCHA/rate limits and recovery flows remain provider-side deployment work.

Dedicated action consoles for Finance, Support and Trust & Safety are intentionally not represented as complete yet. Their roles, permissions, protected corporate entry point and scoped metrics exist; mutation queues should be separated next rather than exposing the broad Operations console to every corporate office.

A green source/CI build proves the code contract, not that ChatGPT Sites has already synchronized the latest `main` commit or that the correct Supabase migration/secrets are live. Those deployment states must be verified separately.
