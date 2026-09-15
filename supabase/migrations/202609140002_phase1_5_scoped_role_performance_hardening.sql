-- Phase 1-5 scoped-role performance hardening.
create index if not exists platform_scoped_role_granted_by_idx
  on public.platform_scoped_role_assignments (granted_by)
  where granted_by is not null;

drop policy if exists platform_scoped_roles_read_self
  on public.platform_scoped_role_assignments;
create policy platform_scoped_roles_read_self
  on public.platform_scoped_role_assignments for select to authenticated
  using (user_id = (select auth.uid()));
