-- A reachable curve, and comments that count.
--
-- The first curve charged 50 XP more for every level, which put level 10 at
-- 2250 XP and level 20 at 9500. On a site where the most active account has
-- logged 488 XP in its whole life, that is a bar nobody clears: the ring would
-- have sat nearly still for months, which is the one thing a progress
-- indicator must not do. Each level now costs 20 more than the last, so the
-- same 488 XP reads as level 7 instead of level 4 and the ring visibly moves.
--
-- Commenting also earns XP now. It was missing because the first pass counted
-- only things people make, and a thread under someone's review is as much of a
-- contribution as the review; a community site that scores writing and ignores
-- replying rewards the wrong half of it.

create or replace function public.profile_xp_rates()
returns table (activity text, xp integer)
language sql immutable set search_path = '' as $$
  values
    ('SESSION', 10),
    ('REVIEW', 25),
    ('JOURNEY', 12),
    ('LIST', 15),
    ('SCREENSHOT', 8),
    -- Half a session. Comments are the cheapest thing to produce here and the
    -- easiest to produce in bulk, so they are worth having and not worth
    -- farming: at this rate the first level still takes four of them, and the
    -- levels after it grow faster than anyone wants to type.
    ('COMMENT', 5),
    ('GAME', 1)
$$;

/**
 * Total XP needed to have reached a level.
 *
 * `10 * (L - 1) * L`, so each level costs 20 XP more than the one before it:
 * 20 to reach level 2, 40 more for the third, 60 for the fourth. The scale
 * starts at 1 because a level nobody can be below is not a level.
 */
create or replace function public.profile_level_threshold(level integer)
returns bigint language sql immutable set search_path = '' as $$
  select case when level <= 1 then 0 else 10::bigint * (level - 1) * level end
$$;

/**
 * The level that much XP buys, the exact inverse of the threshold above.
 *
 * Solved rather than looped, since this runs once per profile on every page
 * that shows a name. `floor` on the positive root of 10L^2 - 10L - xp = 0.
 */
create or replace function public.profile_level_for_xp(xp bigint)
returns integer language sql immutable set search_path = '' as $$
  select greatest(1, floor((1 + sqrt(1 + 0.4 * greatest(xp, 0))) / 2)::integer)
$$;

-- Dropped rather than replaced: the result gains a `comments` column, and
-- Postgres refuses to change the return type of an existing function in place.
drop function if exists public.profile_level(uuid);
create function public.profile_level(target uuid)
returns table (
  level integer,
  xp bigint,
  level_floor bigint,
  next_level_at bigint,
  sessions bigint,
  reviews bigint,
  journeys bigint,
  lists bigint,
  screenshots bigint,
  comments bigint,
  games bigint
)
language sql stable security definer set search_path = ''
as $$
  with counts as (
    select
      (select count(*) from public.diary_entries where profile_id = target) as sessions,
      (select count(*) from public.reviews where profile_id = target) as reviews,
      (select count(*) from public.journeys where profile_id = target) as journeys,
      (select count(*) from public.game_lists where profile_id = target) as lists,
      (select count(*) from public.screenshots where profile_id = target) as screenshots,
      -- Both kinds of comment, and neither counts once deleted: XP that
      -- survives the thing that earned it is a score, not a record of
      -- activity, and deleting a comment would then be a way to keep the
      -- points without keeping the words.
      (
        (select count(*) from public.content_comments
          where author_id = target and deleted_at is null)
        + (select count(*) from public.profile_comments
            where author_id = target and deleted_at is null)
      ) as comments,
      (select count(*) from public.user_games where profile_id = target) as games
  ),
  scored as (
    select
      counts.*,
      counts.sessions * 10
        + counts.reviews * 25
        + counts.journeys * 12
        + counts.lists * 15
        + counts.screenshots * 8
        + counts.comments * 5
        + counts.games * 1 as xp
    from counts
  )
  select
    public.profile_level_for_xp(scored.xp) as level,
    scored.xp,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp)) as level_floor,
    public.profile_level_threshold(public.profile_level_for_xp(scored.xp) + 1) as next_level_at,
    scored.sessions,
    scored.reviews,
    scored.journeys,
    scored.lists,
    scored.screenshots,
    scored.comments,
    scored.games
  from scored
$$;

revoke all on function public.profile_level(uuid) from public;
grant execute on function public.profile_level(uuid) to anon, authenticated;

-- `content_comments` already indexes `(author_id, created_at desc)`, which
-- serves this count; `profile_comments` had nothing on its author.
create index if not exists profile_comments_author_idx
  on public.profile_comments (author_id);
