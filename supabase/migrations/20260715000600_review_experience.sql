alter table public.reviews alter column rating drop not null;
alter table public.reviews drop constraint if exists reviews_rating_check;
alter table public.reviews add constraint reviews_rating_check
  check (rating is null or rating between 0 and 100);

alter table public.reviews
  add column if not exists title varchar(80),
  add column if not exists rating_mode varchar(24) not null default 'stars_5',
  add column if not exists recommended boolean,
  add column if not exists mastered boolean not null default false,
  add column if not exists replay boolean not null default false,
  add column if not exists started_on date,
  add column if not exists finished_on date,
  add column if not exists platform varchar(80),
  add column if not exists aspect_ratings jsonb not null default '[]'::jsonb;

alter table public.reviews drop constraint if exists reviews_rating_mode_check;
alter table public.reviews add constraint reviews_rating_mode_check
  check (rating_mode in ('stars_5', 'level_5', 'score_10', 'score_100', 'recommend'));
alter table public.reviews drop constraint if exists reviews_dates_check;
alter table public.reviews add constraint reviews_dates_check
  check (started_on is null or finished_on is null or finished_on >= started_on);
alter table public.reviews drop constraint if exists reviews_aspects_check;
alter table public.reviews add constraint reviews_aspects_check
  check (jsonb_typeof(aspect_ratings) = 'array' and jsonb_array_length(aspect_ratings) <= 8);

drop function if exists public.save_review(integer,text,integer,text,boolean,public."Visibility");

create function public.save_review(
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
  if char_length(trim(coalesce(review_platform, ''))) > 80 then raise exception 'platform too long' using errcode = '22023'; end if;
  if review_started_on is not null and review_started_on > current_date then raise exception 'invalid start date' using errcode = '22023'; end if;
  if review_finished_on is not null and review_finished_on > current_date then raise exception 'invalid finish date' using errcode = '22023'; end if;
  if review_started_on is not null and review_finished_on is not null and review_finished_on < review_started_on then raise exception 'invalid date range' using errcode = '22023'; end if;
  if jsonb_typeof(coalesce(review_aspects, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(review_aspects, '[]'::jsonb)) > 8 then raise exception 'invalid aspects' using errcode = '22023'; end if;
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
  )
  on conflict (profile_id, igdb_id) do update set
    rating = excluded.rating, content = excluded.content, contains_spoilers = excluded.contains_spoilers,
    visibility = excluded.visibility, title = excluded.title, rating_mode = excluded.rating_mode,
    recommended = excluded.recommended, mastered = excluded.mastered, replay = excluded.replay,
    started_on = excluded.started_on, finished_on = excluded.finished_on, platform = excluded.platform,
    aspect_ratings = excluded.aspect_ratings, updated_at = now()
  returning * into result;

  update public.user_games set quick_rating = review_rating, updated_at = now()
  where profile_id = auth.uid() and igdb_id = game_id;
  if not found then
    insert into public.user_games(profile_id, igdb_id, game_slug, status, quick_rating)
    values(auth.uid(), game_id, trim(game_slug), 'BACKLOG', review_rating);
  end if;
  return result;
end;
$$;

revoke all on function public.save_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) from public, anon;
grant execute on function public.save_review(integer,text,integer,text,boolean,public."Visibility",text,text,boolean,boolean,boolean,date,date,text,jsonb) to authenticated;
