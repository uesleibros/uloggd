import { apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";
import { series } from "@/lib/api/series";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything somebody has played here, counted rather than listed.
 *
 * The retrospective reads a year by pulling its rows out and adding them up
 * in the page, which works because a year is bounded. All time is not: a
 * person with four thousand sessions would send four thousand rows over the
 * wire to produce nine numbers. So every answer here is an aggregate, and
 * every one of them is computed in the database.
 *
 * Nothing is read through a definer function, so the reader's own row-level
 * policies apply the way they do everywhere else: a private session is not in
 * a stranger's totals, and a closed library is not in their platforms.
 */
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      const id = profile.id;

      const [
        { rows: totals },
        { rows: years },
        { rows: weekdays },
        { rows: games },
        { rows: platforms },
        { rows: ratings },
        { rows: records },
        { rows: shelf },
        { rows: runs },
        { rows: taste },
      ] = await series(
        () =>
          client.query(
            `select
               count(*)::int as sessions,
               coalesce(sum(minutes), 0)::int as minutes,
               count(distinct played_on)::int as days,
               count(distinct igdb_id)::int as games,
               count(*) filter (where marks_finish)::int as finished,
               min(played_on) as first_played,
               max(played_on) as last_played
             from public.diary_entries
             where profile_id = $1 and open_since is null`,
            [id],
          ),
        // A year at a time, oldest first: the page draws a bar per year and
        // the shape of somebody's years is the point of the page.
        () =>
          client.query(
            `select
               extract(year from played_on)::int as year,
               count(*)::int as sessions,
               coalesce(sum(minutes), 0)::int as minutes,
               count(distinct igdb_id)::int as games,
               count(*) filter (where marks_finish)::int as finished
             from public.diary_entries
             where profile_id = $1 and open_since is null
             group by 1 order by 1`,
            [id],
          ),
        // Sunday is 0, the way JavaScript counts, so the page does not have
        // to translate the week.
        () =>
          client.query(
            `select
               extract(dow from played_on)::int as weekday,
               count(*)::int as sessions,
               coalesce(sum(minutes), 0)::int as minutes
             from public.diary_entries
             where profile_id = $1 and open_since is null
             group by 1 order by 1`,
            [id],
          ),
        () =>
          client.query(
            `select igdb_id, game_slug,
                    coalesce(sum(minutes), 0)::int as minutes,
                    count(*)::int as sessions,
                    max(played_on) as last_played
             from public.diary_entries
             where profile_id = $1 and open_since is null
             group by igdb_id, game_slug
             order by minutes desc, sessions desc
             limit 12`,
            [id],
          ),
        // What it was played on comes from the copies a run points at, which
        // is the only place the site records a platform. A run with no copy
        // is not counted rather than guessed at.
        () =>
          client.query(
            `select copy.platform_name as platform,
                    count(distinct run.id)::int as runs,
                    coalesce(sum(entry.minutes), 0)::int as minutes
             from public.journeys run
             join public.library_entries copy on copy.id = run.library_entry_id
             left join public.diary_entries entry
               on entry.journey_id = run.id and entry.open_since is null
             where run.profile_id = $1 and copy.platform_name is not null
             group by 1 order by minutes desc, runs desc
             limit 8`,
            [id],
          ),
        // The shape of somebody's scoring, in tens. Two people who both
        // average 78 are not the same reader if one of them never gives a 10.
        () =>
          client.query(
            `select (quick_rating / 10)::int as bucket, count(*)::int as games
             from public.user_games
             where profile_id = $1 and quick_rating is not null
             group by 1 order by 1`,
            [id],
          ),
        () =>
          client.query(
            `select
               (select coalesce(max(minutes), 0) from public.diary_entries
                 where profile_id = $1 and open_since is null)::int as longest_session,
               (select count(*) from public.journeys where profile_id = $1)::int as journeys,
               (select count(*) from public.journeys
                 where profile_id = $1 and status = 'COMPLETED')::int as journeys_completed,
               (select count(*) from public.reviews where profile_id = $1)::int as reviews,
               (select count(*) from public.screenshots
                 where profile_id = $1 and deleted_at is null)::int as screenshots,
               (select count(*) from public.user_games where profile_id = $1)::int as library,
               (select count(*) from public.user_games
                 where profile_id = $1 and quick_rating is not null)::int as rated,
               (select round(avg(quick_rating)) from public.user_games
                 where profile_id = $1 and quick_rating is not null)::int as rating_average,
               (select count(*) from public.library_entries where profile_id = $1)::int as copies`,
            [id],
          ),
        // What the copies say about how somebody gets their games. Read
        // straight from the table, so a closed library answers with nothing
        // here exactly as it does everywhere else: the aggregate cannot say
        // more than the rows a reader is allowed to see.
        () =>
          client.query(
            `select
               kind, value, count(*)::int as copies
             from (
               select 'medium' as kind, medium as value
                 from public.library_entries
                where profile_id = $1 and medium is not null
               union all
               select 'ownership', ownership from public.library_entries
                where profile_id = $1 and ownership is not null
               union all
               select 'storefront', storefront from public.library_entries
                where profile_id = $1 and storefront is not null
             ) said
             group by kind, value
             order by kind, copies desc`,
            [id],
          ),
        // And what the runs say about how they play: a run is a playthrough,
        // so these are answers about passes through games rather than about
        // games.
        () =>
          client.query(
            `select
               count(*)::int as total,
               count(*) filter (where status = 'COMPLETED')::int as completed,
               count(*) filter (where status = 'DROPPED')::int as dropped,
               count(*) filter (where status = 'ON_HOLD')::int as on_hold,
               count(*) filter (where status = 'PLAYING')::int as playing,
               count(*) filter (where replay)::int as replays,
               count(*) filter (where mastered)::int as mastered
             from public.journeys where profile_id = $1`,
            [id],
          ),
        // The material for genres, developers and publishers, which are the
        // three things about somebody's shelf the database cannot answer: a
        // row here knows a game's id and nothing about the game. So it sends
        // the ids with what is true of them locally, and the catalogue is
        // asked once for the rest.
        //
        // Capped, because this is the one answer whose cost is somebody
        // else's: a thousand ids is ten batches in one request to IGDB, and a
        // shelf larger than that is read as its thousand most played. The
        // page says so rather than presenting a partial count as a whole one.
        () =>
          client.query(
            `select igdb_id,
                    sum(minutes)::int as minutes,
                    bool_or(in_library) as in_library
               from (
                 select igdb_id, coalesce(sum(minutes), 0)::int as minutes,
                        false as in_library
                   from public.diary_entries
                  where profile_id = $1 and open_since is null
                  group by igdb_id
                 union all
                 select igdb_id, 0, true
                   from public.user_games where profile_id = $1
               ) shelf
              group by igdb_id
              order by minutes desc, igdb_id
              limit 1000`,
            [id],
          ),
      );

      return {
        data: {
          profile: { username: profile.username, id },
          totals: { ...totals[0], ...records[0] },
          years,
          weekdays,
          games,
          platforms,
          ratings,
          copies: {
            medium: shelf.filter((row) => row.kind === "medium"),
            ownership: shelf.filter((row) => row.kind === "ownership"),
            storefront: shelf.filter((row) => row.kind === "storefront"),
          },
          runs: runs[0],
          taste,
        },
      };
    }),
});
