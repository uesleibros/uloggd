-- Compact owner archive index. The reviews workspace needs exact totals,
-- average rating inputs, and one game selector row per title; returning the
-- raw journal would transfer thousands of rows only to aggregate them again.

create index if not exists diary_entries_profile_game_idx
  on public.diary_entries (profile_id, igdb_id);

create or replace function public.get_review_workspace_index(
  target_profile uuid
)
returns table (
  entry_kind text,
  igdb_id integer,
  game_slug text,
  entry_count bigint,
  rated_count bigint,
  rating_sum bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    'review'::text as entry_kind,
    review.igdb_id,
    min(review.game_slug)::text as game_slug,
    count(*)::bigint as entry_count,
    count(review.rating)::bigint as rated_count,
    coalesce(sum(review.rating), 0)::bigint as rating_sum
  from public.reviews as review
  where review.profile_id = target_profile
  group by review.igdb_id

  union all

  select
    'diary'::text as entry_kind,
    diary.igdb_id,
    min(diary.game_slug)::text as game_slug,
    count(*)::bigint as entry_count,
    0::bigint as rated_count,
    0::bigint as rating_sum
  from public.diary_entries as diary
  where diary.profile_id = target_profile
  group by diary.igdb_id;
$$;

grant execute on function public.get_review_workspace_index(uuid)
  to authenticated, service_role;
