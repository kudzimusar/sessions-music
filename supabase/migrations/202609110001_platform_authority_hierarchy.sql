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

-- The original identity RPC intentionally collapsed every non-owner provider member
-- into provider_staff. Preserve manager authority as its own platform role so the UI
-- and server can distinguish booking managers from ordinary staff without weakening
-- organization tenancy.
create or replace function public.current_identity()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'display_name', p.display_name,
    'session_id', auth.jwt() ->> 'session_id',
    'session_revoked', coalesce(ds.revoked_at is not null, false),
    'roles', coalesce((
      select jsonb_agg(role_value order by role_value)
      from (
        select pra.role as role_value
        from public.platform_role_assignments pra
        where pra.user_id = p.id and pra.revoked_at is null
        union
        select case
          when om.role = 'owner' then 'provider_owner'
          when om.role = 'manager' then 'provider_manager'
          else 'provider_staff'
        end
        from public.organization_memberships om
        where om.user_id = p.id and om.active and om.revoked_at is null
      ) roles_for_user
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', om.organization_id,
        'studio_id', o.studio_id,
        'role', om.role,
        'active', om.active and om.revoked_at is null
      ) order by o.name)
      from public.organization_memberships om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = p.id
    ), '[]'::jsonb),
    'verified_phone', (
      select vc.value_normalized
      from public.verified_contacts vc
      where vc.user_id = p.id and vc.kind = 'phone'
      order by vc.is_primary desc, vc.verified_at desc
      limit 1
    ),
    'verified_email', (
      select vc.value_normalized
      from public.verified_contacts vc
      where vc.user_id = p.id and vc.kind = 'email'
      order by vc.is_primary desc, vc.verified_at desc
      limit 1
    )
  )
  from public.profiles p
  left join public.device_sessions ds
    on ds.user_id = p.id
   and ds.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  where p.id = auth.uid();
$$;

revoke all on function public.current_identity() from public, anon;
grant execute on function public.current_identity() to authenticated;
