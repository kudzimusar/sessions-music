-- Phase 3 close-out discovered during Phase 4: expanded functional roles and scoped corporate authority.
-- Global permissions still come only from platform_role_assignments. Scoped assignments are returned separately
-- and must be evaluated against an explicit resource scope by application policy.

alter table public.platform_role_assignments
  drop constraint if exists platform_role_assignments_role_check;

alter table public.platform_role_assignments
  add constraint platform_role_assignments_role_check
  check (role in (
    'musician','provider_owner','provider_manager','provider_staff',
    'support_agent','support_manager','trust_safety','trust_safety_manager',
    'finance_admin','finance_manager','provider_operations','provider_operations_manager',
    'growth_analyst','growth_manager','data_analyst','data_admin','product_operations',
    'governance_reviewer','operations_admin','corporate_admin','super_admin_eligible','super_admin'
  ));

create table if not exists public.platform_scoped_role_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in (
    'support_agent','support_manager','trust_safety','trust_safety_manager',
    'finance_admin','finance_manager','provider_operations','provider_operations_manager',
    'growth_analyst','growth_manager','data_analyst','data_admin','product_operations',
    'governance_reviewer','operations_admin','corporate_admin'
  )),
  scope_type text not null check (scope_type in ('organization','department','provider','region','case','team')),
  scope_id text not null check (char_length(scope_id) between 1 and 160),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, role, scope_type, scope_id)
);

create index if not exists platform_scoped_role_active_scope_idx
  on public.platform_scoped_role_assignments (scope_type, scope_id, role, user_id)
  where revoked_at is null;

alter table public.platform_scoped_role_assignments enable row level security;
drop policy if exists platform_scoped_roles_read_self on public.platform_scoped_role_assignments;
create policy platform_scoped_roles_read_self
  on public.platform_scoped_role_assignments for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.platform_scoped_role_assignments from authenticated;
grant select on public.platform_scoped_role_assignments to authenticated;

comment on table public.platform_scoped_role_assignments is
  'Sessions scoped role context. A row never grants global authority; application policy must match role, scope_type and scope_id.';

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
    'scoped_roles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'role', psra.role,
        'scope_type', psra.scope_type,
        'scope_id', psra.scope_id
      ) order by psra.scope_type, psra.scope_id, psra.role)
      from public.platform_scoped_role_assignments psra
      where psra.user_id = p.id and psra.revoked_at is null
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
      select vc.value_normalized from public.verified_contacts vc
      where vc.user_id = p.id and vc.kind = 'phone'
      order by vc.is_primary desc, vc.verified_at desc limit 1
    ),
    'verified_email', (
      select vc.value_normalized from public.verified_contacts vc
      where vc.user_id = p.id and vc.kind = 'email'
      order by vc.is_primary desc, vc.verified_at desc limit 1
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
