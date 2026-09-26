-- A journey was readable by anybody, whatever was inside it.
--
-- `journeys_read` was `not viewer_blocked_with(profile_id)` and nothing else,
-- so the title of a run was public even when every session in it was private.
-- A title is not nothing: "Segunda tentativa, depois da recaída" is a
-- sentence somebody wrote for themselves.
--
-- A journey is a container, so it follows what it contains: visible when the
-- reader can see at least one session of it, and always to its author. An
-- empty run is its author's alone until there is something in it to show,
-- which is the right answer rather than an accident of the rule.

create index if not exists diary_entries_journey_idx
  on public.diary_entries (journey_id) where journey_id is not null;

drop policy if exists journeys_read on public.journeys;
create policy journeys_read on public.journeys
  for select to anon, authenticated
  using (
    not public.viewer_blocked_with(profile_id)
    and (
      profile_id = (select auth.uid())
      or exists(
        select 1 from public.diary_entries entry
        where entry.journey_id = journeys.id
          and entry.open_since is null
          and (
            entry.visibility = 'PUBLIC'
            or (entry.visibility = 'FOLLOWERS' and exists(
              select 1 from public.follows
              where follower_id = (select auth.uid())
                and following_id = journeys.profile_id
            ))
          )
      )
    )
  );
