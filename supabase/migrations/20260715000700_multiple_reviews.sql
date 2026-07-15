alter table public.reviews
  drop constraint if exists reviews_profile_id_igdb_id_key;

create index if not exists reviews_profile_game_created_idx
  on public.reviews(profile_id, igdb_id, created_at desc);

drop function if exists public.save_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb);

create function public.create_review(
  game_id integer,
  game_slug text,
  review_rating integer default null,
  review_content text default null,
  spoilers boolean default false,
  review_visibility public."Visibility" default 'PUBLIC',
  review_title text default null,
  review_rating_mode text default 'stars_5',
  review_recommended boolean default null,
  review_mastered boolean default false,
  review_replay boolean default false,
  review_started_on date default null,
  review_finished_on date default null,
  review_platform text default null,
  review_aspects jsonb default '[]'::jsonb
)
returns public.reviews
language plpgsql security definer set search_path = ''
as $$
declare result public.reviews;
declare aspect jsonb;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if game_id <= 0 or char_length(trim(game_slug)) not between 1 and 255 then raise exception 'invalid game' using errcode = '22023'; end if;
  if review_rating is not null and review_rating not between 0 and 100 then raise exception 'invalid rating' using errcode = '22023'; end if;
  if review_rating_mode not in ('stars_5', 'level_5', 'score_10', 'score_100', 'recommend') then raise exception 'invalid rating mode' using errcode = '22023'; end if;
  if review_rating_mode = 'recommend' and review_recommended is null then raise exception 'recommendation required' using errcode = '22023'; end if;
  if review_rating_mode <> 'recommend' and review_rating is null and nullif(trim(coalesce(review_content, '')), '') is null and jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) = 0 then raise exception 'empty review' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_content, ''))) > 5000 then raise exception 'review too long' using errcode = '22023'; end if;
  if char_length(trim(coalesce(review_title, ''))) > 80 then raise exception 'title too long' using errcode = '22023'; end if;
  if review_started_on is not null and review_started_on > current_date then raise exception 'invalid start date' using errcode = '22023'; end if;
  if review_finished_on is not null and (review_finished_on > current_date or (review_started_on is not null and review_finished_on < review_started_on)) then raise exception 'invalid finish date' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(review_aspects, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) > 8 then raise exception 'invalid aspects' using errcode = '22023'; end if;
  if (select count(*) from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) item where coalesce((item ->> 'custom')::boolean, false)) > 5 then raise exception 'too many custom aspects' using errcode = '22023'; end if;
  for aspect in select value from jsonb_array_elements(coalesce(review_aspects, '[]'::jsonb)) loop
    if jsonb_typeof(aspect) <> 'object'
      or char_length(trim(coalesce(aspect ->> 'label', ''))) not between 1 and 32
      or (aspect ->> 'rating')::integer not between 0 and 100
      or char_length(coalesce(aspect ->> 'note', '')) > 240
    then raise exception 'invalid aspect' using errcode = '22023'; end if;
  end loop;

  insert into public.reviews(
    profile_id, igdb_id, game_slug, rating, content, contains_spoilers, visibility,
    title, rating_mode, recommended, mastered, replay, started_on, finished_on,
    platform, aspect_ratings
  ) values (
    auth.uid(), game_id, trim(game_slug), review_rating, nullif(trim(review_content), ''), spoilers, review_visibility,
    nullif(trim(review_title), ''), review_rating_mode, review_recommended, review_mastered, review_replay,
    review_started_on, review_finished_on, nullif(trim(review_platform), ''), coalesce(review_aspects, '[]'::jsonb)
  ) returning * into result;

  insert into public.user_games(profile_id, igdb_id, game_slug, status, quick_rating)
  values(auth.uid(), game_id, trim(game_slug), 'BACKLOG', review_rating)
  on conflict(profile_id, igdb_id) do update set
    quick_rating = excluded.quick_rating, updated_at = now();
  return result;
end;
$$;

revoke all on function public.create_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) from public, anon;
grant execute on function public.create_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) to authenticated;
