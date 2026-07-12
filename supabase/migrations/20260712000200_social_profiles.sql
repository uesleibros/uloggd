create type public."AccountRole" as enum ('USER', 'MODERATOR', 'ADMIN');
create type public."VerificationRequestStatus" as enum ('PENDING', 'REVIEWING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

alter table public.profiles
  add column banner_url text,
  add column thought varchar(160),
  add column role public."AccountRole" not null default 'USER',
  add column verified boolean not null default false,
  add column verified_at timestamptz(6),
  add column verified_by uuid references public.profiles(id) on delete set null,
  add constraint profiles_verified_state_check check (
    (verified = true and verified_at is not null)
    or (verified = false and verified_at is null and verified_by is null)
  );

create index profiles_verified_idx on public.profiles(verified) where verified = true;

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  statement varchar(1000) not null,
  evidence_urls text[] not null default '{}',
  status public."VerificationRequestStatus" not null default 'PENDING',
  moderator_id uuid references public.profiles(id) on delete set null,
  moderator_note varchar(1000),
  submitted_at timestamptz(6) not null default now(),
  updated_at timestamptz(6) not null default now(),
  reviewed_at timestamptz(6),
  constraint verification_requests_statement_check check (length(trim(statement)) >= 20),
  constraint verification_requests_evidence_count_check check (cardinality(evidence_urls) <= 10)
);

create unique index verification_requests_one_active_idx
  on public.verification_requests(profile_id)
  where status in ('PENDING', 'REVIEWING');
create index verification_requests_status_submitted_idx
  on public.verification_requests(status, submitted_at);

grant usage on type public."AccountRole", public."VerificationRequestStatus" to anon, authenticated, service_role;
grant select on public.verification_requests to authenticated;
grant insert (profile_id, statement, evidence_urls) on public.verification_requests to authenticated;
grant all privileges on public.verification_requests to service_role;

revoke update on public.profiles from authenticated;
revoke insert on public.profiles from authenticated;
grant insert (id, username, display_name, bio, thought, avatar_url, banner_url, locale)
  on public.profiles to authenticated;
grant update (username, display_name, bio, thought, avatar_url, banner_url, locale)
  on public.profiles to authenticated;

alter table public.verification_requests enable row level security;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_moderator(user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id and role in ('MODERATOR', 'ADMIN')
  );
$$;

create policy "verification_requests_owner_read"
  on public.verification_requests for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "verification_requests_moderator_read"
  on public.verification_requests for select to authenticated
  using ((select private.is_moderator()));
create policy "verification_requests_owner_insert"
  on public.verification_requests for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and status = 'PENDING'
    and moderator_id is null
    and moderator_note is null
    and reviewed_at is null
    and not exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and verified = true
    )
  );

create or replace function public.review_verification_request(
  request_id uuid,
  approve boolean,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile_id uuid;
begin
  if not (select private.is_moderator()) then
    raise exception 'moderator access required' using errcode = '42501';
  end if;

  select profile_id into target_profile_id
  from public.verification_requests
  where id = request_id and status in ('PENDING', 'REVIEWING')
  for update;

  if target_profile_id is null then
    raise exception 'verification request not found or already reviewed' using errcode = 'P0002';
  end if;

  update public.verification_requests
  set status = case when approve then 'APPROVED' else 'REJECTED' end,
      moderator_id = (select auth.uid()),
      moderator_note = nullif(trim(note), ''),
      reviewed_at = now(),
      updated_at = now()
  where id = request_id;

  if approve then
    update public.profiles
    set verified = true,
        verified_at = now(),
        verified_by = (select auth.uid()),
        updated_at = now()
    where id = target_profile_id;
  end if;
end;
$$;

revoke all on function public.review_verification_request(uuid, boolean, text) from public, anon;
grant execute on function public.review_verification_request(uuid, boolean, text) to authenticated, service_role;

drop table if exists public._prisma_migrations;
