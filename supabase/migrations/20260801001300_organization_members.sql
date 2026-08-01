-- Several people can hold an organization account.
--
-- Until now an organization was a shared login. Three people running a store's
-- account shared one password, which is bad for security and worse for
-- accountability: nothing recorded who did what, and removing someone meant
-- changing the password on everyone.
--
-- The model is deliberately small. A member is a person granted access to an
-- organization account, with one of two roles. It does not attempt delegated
-- posting, per-surface permissions, or acting-as: those need decisions about
-- attribution that nobody has made yet, and a half-answered version of them
-- would be harder to remove than to add later.
--
-- What a member gets today is the ability to be listed, and the ability to be
-- removed. The account's own credentials remain how someone signs in as it.
-- That is honest about the state of things rather than implying more.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'OrganizationRole') then
    -- OWNER can manage members; MANAGER cannot. Two roles, because one is not
    -- enough to remove somebody and three is a hierarchy nobody asked for.
    create type public."OrganizationRole" as enum ('OWNER', 'MANAGER');
  end if;
end
$$;

create table if not exists public.organization_members (
  organization_id uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  role public."OrganizationRole" not null default 'MANAGER',
  -- Who added them, kept so a list of members is also a record of how each one
  -- got there. Null when the row survives the account that added it.
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organization_id, member_id),
  -- An account cannot be a member of itself: it already is itself, and the row
  -- would make "remove this member" able to orphan the account.
  constraint organization_members_distinct check (organization_id <> member_id)
);

create index if not exists organization_members_member_idx
  on public.organization_members (member_id);

alter table public.organization_members enable row level security;

/** True when this viewer manages that organization. */
create or replace function public.manages_organization(target uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.organization_members m
     where m.organization_id = target
       and m.member_id = auth.uid()
  ) or target = auth.uid()
$$;

revoke all on function public.manages_organization(uuid) from public, anon;
grant execute on function public.manages_organization(uuid) to authenticated;

-- Membership is public, like the organization itself. Someone deciding whether
-- to trust a store account benefits from seeing who stands behind it, and a
-- hidden list would make the feature useless for the thing it is for.
drop policy if exists organization_members_read on public.organization_members;
create policy organization_members_read on public.organization_members
  for select using (true);

-- Only the account itself adds members. A manager cannot add more managers,
-- which keeps the question "who let this person in" answerable.
drop policy if exists organization_members_owner_write on public.organization_members;
create policy organization_members_owner_write on public.organization_members
  for insert with check (
    organization_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
       where p.id = organization_id and p.account_type = 'ORGANIZATION'
    )
  );

-- Removal by the account, or by the member themselves. Someone should always
-- be able to walk away from an organization without asking it first.
drop policy if exists organization_members_remove on public.organization_members;
create policy organization_members_remove on public.organization_members
  for delete using (
    organization_id = (select auth.uid()) or member_id = (select auth.uid())
  );

revoke all on public.organization_members from anon, authenticated;
grant select on public.organization_members to anon, authenticated;
grant insert (organization_id, member_id, role, invited_by),
      delete
  on public.organization_members to authenticated;

/**
 * The people behind an organization, for its profile.
 *
 * Returns nothing for an account that is not an organization, so a personal
 * profile cannot grow a members list by having rows written against it.
 */
create or replace function public.organization_members_of(target uuid)
returns table (
  username text,
  display_name text,
  avatar_url text,
  verified boolean,
  role public."OrganizationRole",
  created_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  select p.username::text, p.display_name::text, p.avatar_url::text,
         p.verified, m.role, m.created_at
    from public.organization_members m
    join public.profiles p on p.id = m.member_id
   where m.organization_id = target
     and exists (
       select 1 from public.profiles o
        where o.id = target and o.account_type = 'ORGANIZATION'
     )
   order by m.role, m.created_at
$$;

revoke all on function public.organization_members_of(uuid) from public;
grant execute on function public.organization_members_of(uuid) to anon, authenticated;

/**
 * Adds a member by username, which is what the person adding them actually
 * knows. Raises something the form can show rather than letting a foreign key
 * violation reach the client as an opaque error.
 */
create or replace function public.add_organization_member(
  member_username text,
  member_role text default 'MANAGER'
)
returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
declare resolved public."OrganizationRole";
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and account_type = 'ORGANIZATION'
  ) then
    raise exception 'not an organization' using errcode = '42501';
  end if;
  if member_role not in ('OWNER', 'MANAGER') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  resolved := member_role::public."OrganizationRole";

  select id into target from public.profiles
   where username ilike btrim(member_username);
  if target is null then
    raise exception 'no such account' using errcode = 'P0002';
  end if;
  if target = auth.uid() then
    raise exception 'cannot add the account itself' using errcode = '22023';
  end if;

  insert into public.organization_members (organization_id, member_id, role, invited_by)
  values (auth.uid(), target, resolved, auth.uid())
  on conflict (organization_id, member_id) do update set role = excluded.role;
end;
$$;

revoke all on function public.add_organization_member(text, text) from public, anon;
grant execute on function public.add_organization_member(text, text) to authenticated;

-- Demoting an organization back to a person takes its members with it: the
-- rows would otherwise describe a membership of something that is no longer an
-- organization, and `organization_members_of` would stop returning them while
-- they sat in the table forever.
create or replace function private.clear_organization_fields()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.account_type <> 'ORGANIZATION' then
    new.organization_tagline := null;
    new.organization_category := null;
    new.organization_url := null;
    new.organization_company_slug := null;
    delete from public.organization_members where organization_id = new.id;
  end if;
  return new;
end;
$$;
