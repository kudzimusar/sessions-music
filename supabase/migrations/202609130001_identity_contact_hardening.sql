-- Phase 4.5 identity hardening: a verified contact collision must never move
-- identity metadata or authority from one Sessions user to another.
-- Supabase Auth remains the identity authority; this migration only keeps the
-- normalized verified-contact mirror safe and deterministic.

with ranked as (
  select id,row_number() over (partition by user_id,kind order by is_primary desc,verified_at desc,id desc) as rn
  from public.verified_contacts
)
update public.verified_contacts vc
set is_primary=false
from ranked r
where vc.id=r.id and r.rn>1 and vc.is_primary;

create unique index if not exists verified_contacts_one_primary_kind_idx
  on public.verified_contacts (user_id,kind)
  where is_primary;

create or replace function sessions_private.sync_auth_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inferred_name text;
  contact_owner uuid;
  normalized_contact text;
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
    normalized_contact := new.phone;
    contact_owner := null;
    select vc.user_id into contact_owner
      from public.verified_contacts vc
      where vc.kind='phone' and vc.value_normalized=normalized_contact
      limit 1;

    if contact_owner is null then
      insert into public.verified_contacts (user_id, kind, value_normalized, verified_at, is_primary)
      values (new.id, 'phone', normalized_contact, new.phone_confirmed_at, true)
      on conflict (kind, value_normalized) do nothing;
      select vc.user_id into contact_owner
        from public.verified_contacts vc
        where vc.kind='phone' and vc.value_normalized=normalized_contact
        limit 1;
    end if;

    if contact_owner = new.id then
      update public.verified_contacts
      set is_primary=false
      where user_id=new.id and kind='phone' and value_normalized<>normalized_contact and is_primary;
      update public.verified_contacts
      set verified_at=greatest(verified_at,new.phone_confirmed_at),is_primary=true
      where user_id=new.id and kind='phone' and value_normalized=normalized_contact;
    elsif contact_owner is not null then
      insert into sessions_private.identity_audit (actor_user_id,subject_user_id,event,context)
      values (new.id,new.id,'verified_contact_conflict',jsonb_build_object('kind','phone','reason','contact_already_linked'));
    end if;
  end if;

  if new.email is not null and new.email_confirmed_at is not null then
    normalized_contact := lower(new.email);
    contact_owner := null;
    select vc.user_id into contact_owner
      from public.verified_contacts vc
      where vc.kind='email' and vc.value_normalized=normalized_contact
      limit 1;

    if contact_owner is null then
      insert into public.verified_contacts (user_id, kind, value_normalized, verified_at, is_primary)
      values (new.id, 'email', normalized_contact, new.email_confirmed_at, true)
      on conflict (kind, value_normalized) do nothing;
      select vc.user_id into contact_owner
        from public.verified_contacts vc
        where vc.kind='email' and vc.value_normalized=normalized_contact
        limit 1;
    end if;

    if contact_owner = new.id then
      update public.verified_contacts
      set is_primary=false
      where user_id=new.id and kind='email' and value_normalized<>normalized_contact and is_primary;
      update public.verified_contacts
      set verified_at=greatest(verified_at,new.email_confirmed_at),is_primary=true
      where user_id=new.id and kind='email' and value_normalized=normalized_contact;
    elsif contact_owner is not null then
      insert into sessions_private.identity_audit (actor_user_id,subject_user_id,event,context)
      values (new.id,new.id,'verified_contact_conflict',jsonb_build_object('kind','email','reason','contact_already_linked'));
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function sessions_private.sync_auth_identity() from public,anon,authenticated;
