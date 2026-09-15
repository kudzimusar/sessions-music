-- Phase 1-5 identity grant hardening.
-- Scoped authority is server-managed; clients only need their own read projection.
revoke all on table public.platform_scoped_role_assignments from anon, authenticated;
grant select on table public.platform_scoped_role_assignments to authenticated;
