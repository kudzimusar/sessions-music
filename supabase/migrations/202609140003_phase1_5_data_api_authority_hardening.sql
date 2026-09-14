-- Phase 1-5 Data API authority hardening.
-- Keep Supabase identity-only, preserve D1/R2 marketplace ownership, and fail closed
-- around device/session authority without broadening client write privileges.

-- Future public/private objects must be explicitly granted. PostgreSQL grants
-- EXECUTE on new functions to PUBLIC by default, so remove that inheritance here.
revoke create on schema public from public, anon, authenticated;
revoke all on schema sessions_private from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema sessions_private
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema sessions_private
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema sessions_private
  revoke execute on functions from public, anon, authenticated;

-- The private audit surface stays server/trigger only. RLS with no ordinary
-- client policy is intentional and should not be relaxed merely to clear a lint.
revoke all on table sessions_private.identity_audit from public, anon, authenticated;
revoke execute on all functions in schema sessions_private from public, anon, authenticated;

-- register_current_device remains an intentional authenticated RPC. SECURITY
-- DEFINER is required so clients do not receive direct INSERT/UPDATE privileges on
-- device_sessions. The RPC now proves the JWT session exists in auth.sessions,
-- belongs to auth.uid(), and refuses to refresh a locally revoked device row.
create or replace function public.register_current_device(
  device_name text default 'Web browser',
  platform text default 'web'
)
returns public.device_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_session_text text := nullif(auth.jwt() ->> 'session_id', '');
  caller_session_id uuid;
  saved public.device_sessions;
begin
  if caller_id is null or caller_session_text is null then
    raise exception 'An active authenticated session is required';
  end if;

  begin
    caller_session_id := caller_session_text::uuid;
  exception when invalid_text_representation then
    raise exception 'Authenticated session identifier is invalid';
  end;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = caller_session_id
      and s.user_id = caller_id
  ) then
    raise exception 'Authenticated session is no longer active';
  end if;

  if device_name is null or char_length(trim(device_name)) not between 1 and 80 then
    raise exception 'Device name must be between 1 and 80 characters';
  end if;
  if platform is null or platform not in ('web', 'android', 'ios') then
    raise exception 'Unsupported device platform';
  end if;

  insert into public.device_sessions (session_id, user_id, device_name, platform)
  values (caller_session_id, caller_id, trim(device_name), platform)
  on conflict (session_id) do update
    set device_name = excluded.device_name,
        platform = excluded.platform,
        last_seen_at = now()
  where public.device_sessions.user_id = caller_id
    and public.device_sessions.revoked_at is null
  returning * into saved;

  if saved.session_id is null then
    if exists (
      select 1 from public.device_sessions ds
      where ds.session_id = caller_session_id
        and ds.user_id = caller_id
        and ds.revoked_at is not null
    ) then
      raise exception 'Device session has been revoked';
    end if;
    raise exception 'Session belongs to another account';
  end if;

  return saved;
end;
$$;

-- revoke_device likewise requires a real current caller session. It can only act
-- on a device row owned by the caller, is idempotent for already-revoked rows,
-- and writes one audit event for the actual state transition.
create or replace function public.revoke_device(target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_session_text text := nullif(auth.jwt() ->> 'session_id', '');
  caller_session_id uuid;
  target_owner uuid;
  target_revoked_at timestamptz;
begin
  if caller_id is null or caller_session_text is null then
    raise exception 'An active authenticated session is required';
  end if;
  if target_session_id is null then
    raise exception 'Target session is required';
  end if;

  begin
    caller_session_id := caller_session_text::uuid;
  exception when invalid_text_representation then
    raise exception 'Authenticated session identifier is invalid';
  end;

  if not exists (
    select 1
    from auth.sessions s
    where s.id = caller_session_id
      and s.user_id = caller_id
  ) then
    raise exception 'Authenticated session is no longer active';
  end if;

  select ds.user_id, ds.revoked_at
    into target_owner, target_revoked_at
  from public.device_sessions ds
  where ds.session_id = target_session_id;

  if target_owner is null or target_owner <> caller_id then
    return false;
  end if;
  if target_revoked_at is not null then
    return true;
  end if;

  update public.device_sessions
  set revoked_at = now(),
      revocation_reason = 'Revoked by account owner'
  where session_id = target_session_id
    and user_id = caller_id
    and revoked_at is null;

  insert into sessions_private.identity_audit (actor_user_id, subject_user_id, event, context)
  values (
    caller_id,
    caller_id,
    'device_session_revoked',
    jsonb_build_object('session_id', target_session_id)
  );
  return true;
end;
$$;

-- Reassert the intentional RPC surface. Anonymous callers have no execute path;
-- authenticated callers receive only these bounded operations and current_identity.
revoke all on function public.register_current_device(text, text) from public, anon, authenticated;
revoke all on function public.revoke_device(uuid) from public, anon, authenticated;
revoke all on function public.current_identity() from public, anon, authenticated;
grant execute on function public.register_current_device(text, text) to authenticated;
grant execute on function public.revoke_device(uuid) to authenticated;
grant execute on function public.current_identity() to authenticated;

-- Reassert least-privilege table grants for authority-bearing objects. Client
-- role/membership writes remain impossible even before RLS is considered.
revoke all on table public.platform_role_assignments from anon, authenticated;
revoke all on table public.platform_scoped_role_assignments from anon, authenticated;
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_memberships from anon, authenticated;
revoke all on table public.verified_contacts from anon, authenticated;
revoke all on table public.device_sessions from anon, authenticated;

grant select on table public.platform_role_assignments to authenticated;
grant select on table public.platform_scoped_role_assignments to authenticated;
grant select on table public.organizations to authenticated;
grant select on table public.organization_memberships to authenticated;
grant select on table public.verified_contacts to authenticated;
grant select on table public.device_sessions to authenticated;
