-- Personal award editions. The category document is replaced atomically under
-- optimistic version control; a winner must always be one of its nominees.
create table public.game_awards (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique default public.new_public_id(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  year integer not null check (year between 1970 and 9999),
  mode text not null check (mode in ('PERSONAL','PREDICTIONS')),
  rules text not null default '' check (char_length(rules) <= 5000),
  source text not null default 'CATALOG' check (source in ('CATALOG','LIST','PLAYED_YEAR')),
  -- Keep the restriction if the source is deleted. No FK SET NULL may silently
  -- turn a restricted edition into an unrestricted one.
  source_list_id uuid,
  visibility public."Visibility" not null default 'PRIVATE',
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')),
  categories jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((source = 'LIST') = (source_list_id is not null))
);
create index game_awards_owner_idx on public.game_awards (profile_id, updated_at desc, id desc);
create index game_awards_public_idx on public.game_awards (updated_at desc, id desc)
  where status='PUBLISHED' and visibility='PUBLIC';
alter table public.game_awards enable row level security;
create function public.game_award_visible(target uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select coalesce(auth.uid()=a.profile_id,false) or (
    a.status='PUBLISHED' and public.profile_visible(a.profile_id)
    and not exists(select 1 from public.profile_moderation_state state
      where state.profile_id=a.profile_id and (state.banned_until is null or state.banned_until>now()))
    and (a.visibility='PUBLIC' or (a.visibility='FOLLOWERS' and exists (
      select 1 from public.follows where follower_id=auth.uid() and following_id=a.profile_id
    )))
  ) from public.game_awards a where a.id=target),false)
$$;
revoke all on function public.game_award_visible(uuid) from public;
grant execute on function public.game_award_visible(uuid) to anon, authenticated;
create policy game_awards_read on public.game_awards for select to anon, authenticated
  using (public.game_award_visible(id));
create policy game_awards_insert on public.game_awards for insert to authenticated with check (auth.uid()=profile_id);
create policy game_awards_update on public.game_awards for update to authenticated using (auth.uid()=profile_id) with check (auth.uid()=profile_id);
create policy game_awards_delete on public.game_awards for delete to authenticated using (auth.uid()=profile_id);
grant select on public.game_awards to anon, authenticated;
grant insert, update, delete on public.game_awards to authenticated;

-- Dates explicitly recorded by the player, never a guessed year from a status
-- update. The union is reused by writes and live reads.
create function private.award_played_ids(owner_id uuid, award_year integer)
returns setof integer language sql stable security definer set search_path='' as $$
  select igdb_id from public.diary_entries where profile_id=owner_id
    and open_since is null and played_on >= make_date(award_year,1,1) and played_on < make_date(award_year+1,1,1)
  union select igdb_id from public.reviews where profile_id=owner_id and (
    started_on >= make_date(award_year,1,1) and started_on < make_date(award_year+1,1,1)
    or finished_on >= make_date(award_year,1,1) and finished_on < make_date(award_year+1,1,1))
  union select igdb_id from public.journeys where profile_id=owner_id and (
    started_on >= make_date(award_year,1,1) and started_on < make_date(award_year+1,1,1)
    or finished_on >= make_date(award_year,1,1) and finished_on < make_date(award_year+1,1,1))
$$;
revoke all on function private.award_played_ids(uuid,integer) from public, anon, authenticated;

create function private.validate_game_award() returns trigger language plpgsql security definer set search_path='' as $$
declare c jsonb; n jsonb; nominated integer; allowed integer[]; ids text[] := '{}'; category_id text;
begin
  if tg_op='UPDATE' and (new.id<>old.id or new.profile_id<>old.profile_id or new.public_id<>old.public_id) then
    raise exception 'award identity is immutable' using errcode='22023';
  end if;
  if jsonb_typeof(new.categories)<>'array' or jsonb_array_length(new.categories) not between 1 and 30 then
    raise exception 'invalid categories' using errcode='22023';
  end if;
  if new.source='LIST' then
    if not exists(select 1 from public.game_lists where id=new.source_list_id and profile_id=new.profile_id) then
      raise exception 'source list unavailable' using errcode='22023';
    end if;
    select coalesce(array_agg(igdb_id),'{}') into allowed from public.game_list_items where list_id=new.source_list_id;
  elsif new.source='PLAYED_YEAR' then
    select coalesce(array_agg(igdb_id),'{}') into allowed from private.award_played_ids(new.profile_id,new.year) as played(igdb_id);
  end if;
  for c in select value from jsonb_array_elements(new.categories) loop
    category_id:=c->>'id';
    if jsonb_typeof(c)<>'object' or category_id is null or category_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or lower(category_id)=any(ids) or coalesce(char_length(trim(c->>'name')),0) not between 1 and 100
      or coalesce(jsonb_typeof(c->'name'),'')<>'string' or coalesce(jsonb_typeof(c->'description'),'')<>'string'
      or char_length(c->>'description')>1000 or coalesce(c->>'max_nominees','') !~ '^[0-9]+$'
      or (c->>'max_nominees')::numeric not between 1 and 20 or coalesce(jsonb_typeof(c->'nominees'),'')<>'array'
      or jsonb_typeof(c->'max_nominees')<>'number' or not(c ? 'winner') then
      raise exception 'invalid category' using errcode='22023';
    end if;
    ids:=array_append(ids,lower(category_id));
    if jsonb_array_length(c->'nominees')>(c->>'max_nominees')::integer
      or (new.status='PUBLISHED' and jsonb_array_length(c->'nominees')=0)
      or (select count(*)<>count(distinct value) from jsonb_array_elements(c->'nominees')) then
      raise exception 'invalid nominees' using errcode='22023';
    end if;
    for n in select value from jsonb_array_elements(c->'nominees') loop
      if jsonb_typeof(n)<>'number' or n::text !~ '^[0-9]+$' or n::text::numeric not between 1 and 2147483647 then
        raise exception 'invalid game id' using errcode='22023';
      end if;
      nominated:=n::text::integer;
      if new.source<>'CATALOG' and not(nominated=any(allowed)) then
        raise exception 'game outside eligibility' using errcode='22023';
      end if;
    end loop;
    if c->'winner'<>'null'::jsonb and (jsonb_typeof(c->'winner')<>'number' or not(c->'nominees' @> jsonb_build_array(c->'winner'))) then
      raise exception 'winner must be nominated' using errcode='22023';
    end if;
  end loop;
  if tg_op='INSERT' then
    perform private.claim_rate_limit('award.create',20,interval '1 hour');
    new.version:=1;
  else
    perform private.claim_rate_limit('award.update',120,interval '10 minutes');
    new.version:=old.version+1;
  end if;
  new.updated_at:=now();
  return new;
end $$;
revoke all on function private.validate_game_award() from public, anon, authenticated;
create trigger require_mfa_for_mutation before insert or update or delete on public.game_awards
  for each row execute function private.require_mfa_for_mutation();
create trigger game_awards_validate before insert or update on public.game_awards
  for each row execute function private.validate_game_award();

-- This returns only nominees already chosen for an edition the caller can
-- read. It never exposes the rest of a private source list or library.
create function public.live_award_categories(target uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a public.game_awards; allowed integer[]; c jsonb; nominees jsonb; result jsonb := '[]';
begin
  select * into a from public.game_awards where id=target;
  if not found or not public.game_award_visible(target) then
    raise exception 'award not found' using errcode='P0002';
  end if;
  if a.source='CATALOG' then return a.categories; end if;
  if a.source='LIST' then
    select coalesce(array_agg(item.igdb_id),'{}') into allowed from public.game_list_items item
      join public.game_lists l on l.id=item.list_id where l.id=a.source_list_id and l.profile_id=a.profile_id;
  else
    select coalesce(array_agg(igdb_id),'{}') into allowed from private.award_played_ids(a.profile_id,a.year) as played(igdb_id);
  end if;
  for c in select value from jsonb_array_elements(a.categories) loop
    select coalesce(jsonb_agg(value order by position),'[]') into nominees
      from jsonb_array_elements(c->'nominees') with ordinality as chosen(value,position)
      where value::text::integer=any(allowed);
    result:=result || jsonb_build_array(c || jsonb_build_object('nominees',nominees,'winner',
      case when nominees @> jsonb_build_array(c->'winner') then c->'winner' else 'null'::jsonb end));
  end loop;
  return result;
end $$;
revoke all on function public.live_award_categories(uuid) from public;
grant execute on function public.live_award_categories(uuid) to anon, authenticated;

create function public.award_eligible_games(target uuid)
returns table(igdb_id integer, game_slug text) language plpgsql stable security definer set search_path='' as $$
declare a public.game_awards;
begin
  select * into a from public.game_awards where id=target and profile_id=auth.uid();
  if not found then raise exception 'award not found' using errcode='P0002'; end if;
  if a.source='LIST' then
    return query select item.igdb_id, item.game_slug::text from public.game_list_items item
      join public.game_lists l on l.id=item.list_id
      where l.id=a.source_list_id and l.profile_id=a.profile_id order by item.position,item.igdb_id;
  elsif a.source='PLAYED_YEAR' then
    return query select played.igdb_id, coalesce(
      (select d.game_slug::text from public.diary_entries d where d.profile_id=a.profile_id and d.igdb_id=played.igdb_id limit 1),
      (select r.game_slug::text from public.reviews r where r.profile_id=a.profile_id and r.igdb_id=played.igdb_id limit 1),
      (select j.game_slug::text from public.journeys j where j.profile_id=a.profile_id and j.igdb_id=played.igdb_id limit 1),'')
      from private.award_played_ids(a.profile_id,a.year) as played(igdb_id) order by played.igdb_id;
  else
    return query select g.igdb_id, g.game_slug::text from public.user_games g
      where g.profile_id=a.profile_id order by g.game_slug,g.igdb_id;
  end if;
end $$;
revoke all on function public.award_eligible_games(uuid) from public;
grant execute on function public.award_eligible_games(uuid) to authenticated;
