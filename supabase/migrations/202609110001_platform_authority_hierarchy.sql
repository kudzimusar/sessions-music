-- Sessions production authority hierarchy.
-- Identity and tenant authorization live in Supabase; marketplace/product data remains in D1/R2.
-- This migration is additive and must be applied only to the dedicated Sessions Supabase project.

alter table public.platform_role_assignments
  drop constraint if exists platform_role_assignments_role_check;

alter table public.platform_role_assignments
  add constraint platform_role_assignments_role_check
  check (role in (
    'musician',
    'provider_owner',
    'provider_manager',
    'provider_staff',
    'support_agent',
    'trust_safety',
    'finance_admin',
    'operations_admin',
    'corporate_admin',
    'super_admin'
  ));

create index if not exists platform_role_assignments_active_role_idx
  on public.platform_role_assignments (role, user_id)
  where revoked_at is null;

-- Keep role assignment server-controlled. Authenticated clients may inspect only
-- their own effective roles through existing RLS/current_identity(), but cannot
-- grant, revoke or promote themselves.
revoke insert, update, delete on public.platform_role_assignments from authenticated;

comment on table public.platform_role_assignments is
  'Server-managed Sessions authority assignments. Super admin is the only app role allowed to grant/revoke platform roles.';
