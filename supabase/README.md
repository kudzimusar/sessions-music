# Sessions Supabase identity handoff

Target: dedicated active project **Sessions Music** (`ennfiyxlkvlmtkmibltz`), `ap-northeast-1` (Tokyo), URL `https://ennfiyxlkvlmtkmibltz.supabase.co`.

Cloudflare D1/R2 remain the marketplace/product system of record for studios, rooms, booking inventory, pricing, settlements and media. Supabase owns authentication plus normalized identity and authorization authority only.

## Current project baseline

When this project was connected on 14 September 2026 it was `ACTIVE_HEALTHY`, had zero Auth users, no application migrations and no Sessions public identity tables. That clean baseline is intentional: do not copy application data or stale schema from another Supabase project.

The application uses the modern publishable client key for browser/native Auth initialization. Secret/service-role credentials remain server-only and must never be committed or placed in the native package.

## Authoritative migration sequence

Apply the checked-in migrations to **`ennfiyxlkvlmtkmibltz` only**, in this order:

1. `migrations/202609020001_phase_r_identity.sql`
   - profiles
   - server-managed platform roles
   - provider organizations/memberships
   - verified contacts
   - device sessions
   - merge/deletion requests
   - private identity audit
   - RLS and authenticated read/self-service boundaries
2. `migrations/202609020002_phase_r_identity_hardening.sql`
   - RLS defense in depth for the private audit table
   - missing administrative FK indexes
3. `migrations/202609110001_platform_authority_hierarchy.sql`
   - expanded server-managed platform roles
   - distinct provider-manager authority
4. `migrations/202609120001_phase3_scoped_corporate_authority.sql`
   - scoped corporate/operations role assignments
   - scoped roles remain contextual and never become global authority
5. `migrations/202609130001_identity_contact_hardening.sql`
   - one primary verified contact per kind
   - contact collisions fail closed instead of moving identity/authority between users
   - registered-session posture exposed through `current_identity()`

After every schema change, run both Supabase security and performance advisors and treat new findings as release blockers until reviewed.

## Runtime activation

The verified application contract is:

```text
SESSIONS_IDENTITY_MODE=supabase
SUPABASE_AUTH_ENABLED=true
SUPABASE_URL=https://ennfiyxlkvlmtkmibltz.supabase.co
SUPABASE_PUBLISHABLE_KEY=<Sessions Music publishable key>
```

Keep every provider flag false until that delivery path has been configured and tested in this project:

```text
SUPABASE_PHONE_AUTH_ENABLED=false
SUPABASE_EMAIL_AUTH_ENABLED=false
SUPABASE_GOOGLE_AUTH_ENABLED=false
SUPABASE_APPLE_AUTH_ENABLED=false
```

For native Phase 4.5, enable email or phone only after a real device/simulator receives and verifies the expected OTP. Google/Apple require their native OAuth callback/deep-link flow before their flags may be enabled.

## Security boundaries

- Never use or modify `church-os-dev` / `svhxjfearcuqxikzvlyb` for Sessions.
- Never reuse ChatGPT Sites `/welcome` cookies as native identity.
- Never expose the Supabase secret/service-role key to browser or native code.
- Never derive corporate/provider authority from user-editable metadata.
- Never move rooms, bookings, pricing, settlement or media ownership into Supabase during this identity workstream.
- Individual staff identities are mandatory; no shared corporate/admin credentials.
- Privileged administration must retain its separate step-up/MFA policy even when ordinary customer/provider sessions are AAL1.
