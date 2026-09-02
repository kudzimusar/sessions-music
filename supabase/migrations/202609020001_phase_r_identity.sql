-- Phase R / Workstream 1: production identity and tenant authorization.
-- Supabase owns identity only. Studio, room, booking, pricing and media records
-- remain in Cloudflare D1/R2.

create schema if not exists sessions_private;
revoke all on schema sessions_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_role_assignments (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('musician', 'provider_owner', 'provider_staff', 'operations_admin')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (user_id, role)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null unique check (char_length(studio_id) between 1 and 100),
  name text not null check (char_length(name) between 2 and 120),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (organization_id, user_id)
);

create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);
create index organization_memberships_active_user_idx
  on public.organization_memberships (user_id, organization_id)
  where active and revoked_at is null;
create index organizations_created_by_idx on public.organizations (created_by);

create table public.verified_contacts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('phone', 'email')),
  value_normalized text not null check (char_length(value_normalized) between 3 and 320),
  is_primary boolean not null default true,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (kind, value_normalized),
  unique (user_id, kind, value_normalized)
);

create index verified_contacts_user_id_idx on public.verified_contacts (user_id);

create table public.device_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null default 'Web browser' check (char_length(device_name) between 1 and 80),
  platform text not null default 'web' check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text check (revocation_reason is null or char_length(revocation_reason) <= 120)
);

create index device_sessions_user_id_idx on public.device_sessions (user_id);
create index device_sessions_active_user_idx on public.device_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

create table public.account_merge_requests (
  id bigint generated always as identity primary key,
  source_user_id uuid not null references auth.users(id) on delete cascade,
  target_contact text not null check (char_length(target_contact) between 3 and 320),
  reason text not null default '' check (char_length(reason) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 1000)
);

create index account_merge_requests_source_user_idx
  on public.account_merge_requests (source_user_id, requested_at desc);
create unique index account_merge_requests_one_pending_idx
  on public.account_merge_requests (source_user_id)
  where status = 'pending';

create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,
  audit_reference text check (audit_reference is null or char_length(audit_reference) <= 120)
);

create table sessions_private.identity_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  subject_user_id uuid references auth.users(id) on delete set null,
  event text not null check (char_length(event) between 1 and 80),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index identity_audit_subject_idx
  on sessions_private.identity_audit (subject_user_id, created_at desc);

create or replace function sessions_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function sessions_private.touch_updated_at();

create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function sessions_private.touch_updated_at();

create or replace function sessions_private.sync_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inferred_name text;
begin
  inferred_name := left(coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    ''
  ), 120);

  insert into public.profiles (id, display_name)
  values (new.id, inferred_name)
  on conflict (id) do update
    set display_name = case
      when public.profiles.display_name = '' then excluded.display_name
      else public.profiles.display_name
    end;

  insert into public.platform_role_assignments (user_id, role)
  values (new.id, 'musician')
  on conflict (user_id, role) do nothing;

  if new.phone is not null and new.phone_confirmed_at is not null then
    insert into public.verified_contacts (user_id, kind, value_normalized, verified_at)
    values (new.id, 'phone', new.phone, new.phone_confirmed_at)
    on conflict (kind, value_normalized) do update
      set user_id = excluded.user_id,
          verified_at = greatest(public.verified_contacts.verified_at, excluded.verified_at),
          is_primary = true;
  end if;

  if new.email is not null and new.email_confirmed_at is not null then
    insert into public.verified_contacts (user_id, kind, value_normalized, verified_at)
    values (new.id, 'email', lower(new.email), new.email_confirmed_at)
    on conflict (kind, value_normalized) do update
      set user_id = excluded.user_id,
          verified_at = greatest(public.verified_contacts.verified_at, excluded.verified_at),
          is_primary = true;
  end if;

  return new;
end;
$$;

revoke execute on function sessions_private.sync_auth_identity() from public, anon, authenticated;
revoke execute on function sessions_private.touch_updated_at() from public, anon, authenticated;

create trigger auth_user_identity_sync
after insert or update of phone, phone_confirmed_at, email, email_confirmed_at, raw_user_meta_data
on auth.users
for each row execute function sessions_private.sync_auth_identity();

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
  caller_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  saved public.device_sessions;
begin
  if caller_id is null or caller_session_id is null then
    raise exception 'An active authenticated session is required';
  end if;
  if char_length(trim(device_name)) not between 1 and 80 then
    raise exception 'Device name must be between 1 and 80 characters';
  end if;
  if platform not in ('web', 'android', 'ios') then
    raise exception 'Unsupported device platform';
  end if;

  insert into public.device_sessions (session_id, user_id, device_name, platform)
  values (caller_session_id, caller_id, trim(device_name), platform)
  on conflict (session_id) do update
    set device_name = excluded.device_name,
        platform = excluded.platform,
        last_seen_at = now()
  where public.device_sessions.user_id = caller_id
  returning * into saved;

  if saved.session_id is null then
    raise exception 'Session belongs to another account';
  end if;
  return saved;
end;
$$;

create or replace function public.revoke_device(target_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  changed_count integer;
begin
  if caller_id is null then
    raise exception 'An active authenticated session is required';
  end if;

  update public.device_sessions
  set revoked_at = coalesce(revoked_at, now()),
      revocation_reason = coalesce(revocation_reason, 'Revoked by account owner')
  where session_id = target_session_id
    and user_id = caller_id;
  get diagnostics changed_count = row_count;

  if changed_count = 1 then
    insert into sessions_private.identity_audit (actor_user_id, subject_user_id, event, context)
    values (caller_id, caller_id, 'device_session_revoked', jsonb_build_object('session_id', target_session_id));
    return true;
  end if;
  return false;
end;
$$;

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
        select case when om.role = 'owner' then 'provider_owner' else 'provider_staff' end
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

revoke all on function public.register_current_device(text, text) from public, anon;
revoke all on function public.revoke_device(uuid) from public, anon;
revoke all on function public.current_identity() from public, anon;
grant execute on function public.register_current_device(text, text) to authenticated;
grant execute on function public.revoke_device(uuid) to authenticated;
grant execute on function public.current_identity() to authenticated;

alter table public.profiles enable row level security;
alter table public.platform_role_assignments enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.verified_contacts enable row level security;
alter table public.device_sessions enable row level security;
alter table public.account_merge_requests enable row level security;
alter table public.account_deletion_requests enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy platform_roles_select_own on public.platform_role_assignments
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy organizations_select_member on public.organizations
  for select to authenticated
  using (exists (
    select 1 from public.organization_memberships om
    where om.organization_id = organizations.id
      and om.user_id = (select auth.uid())
      and om.active
      and om.revoked_at is null
  ));

create policy organization_memberships_select_own on public.organization_memberships
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy verified_contacts_select_own on public.verified_contacts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy device_sessions_select_own on public.device_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy account_merge_requests_select_own on public.account_merge_requests
  for select to authenticated
  using ((select auth.uid()) = source_user_id);
create policy account_merge_requests_insert_own on public.account_merge_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = source_user_id
    and status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy account_deletion_requests_insert_own on public.account_deletion_requests
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and processed_at is null
    and processed_by is null
  );

revoke all on public.profiles from anon, authenticated;
revoke all on public.platform_role_assignments from anon, authenticated;
revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_memberships from anon, authenticated;
revoke all on public.verified_contacts from anon, authenticated;
revoke all on public.device_sessions from anon, authenticated;
revoke all on public.account_merge_requests from anon, authenticated;
revoke all on public.account_deletion_requests from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.platform_role_assignments to authenticated;
grant select on public.organizations to authenticated;
grant select on public.organization_memberships to authenticated;
grant select on public.verified_contacts to authenticated;
grant select on public.device_sessions to authenticated;
grant select, insert on public.account_merge_requests to authenticated;
grant select, insert on public.account_deletion_requests to authenticated;
grant usage, select on sequence public.account_merge_requests_id_seq to authenticated;

