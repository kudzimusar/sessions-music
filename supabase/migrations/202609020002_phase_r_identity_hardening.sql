-- Proposed advisor hardening after phase_r_identity.
-- This private table has no anon/authenticated grants and lives outside the
-- exposed public schema. Enabling RLS with no policies adds defense in depth;
-- trusted SECURITY DEFINER functions and server administration remain the only writers.
alter table sessions_private.identity_audit enable row level security;

-- Cover administrative foreign keys reported by the performance advisor.
create index identity_audit_actor_user_idx
  on sessions_private.identity_audit (actor_user_id, created_at desc);
create index platform_role_assignments_granted_by_idx
  on public.platform_role_assignments (granted_by)
  where granted_by is not null;
create index organization_memberships_granted_by_idx
  on public.organization_memberships (granted_by)
  where granted_by is not null;
create index account_merge_requests_reviewed_by_idx
  on public.account_merge_requests (reviewed_by)
  where reviewed_by is not null;
create index account_deletion_requests_processed_by_idx
  on public.account_deletion_requests (processed_by)
  where processed_by is not null;
