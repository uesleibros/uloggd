import { ApiFailure, apiRoute } from "@/lib/api/route";
import { lastSegment, segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";
import { parseWrappedYear } from "@/lib/year-wrapped";
import { series } from "@/lib/api/series";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A year of somebody's uloggd, read from everything they did in it.
 *
 * It read the diary and the reviews and nothing else, so a person who keeps a
 * library and never writes a session got "nothing logged" about a year they
 * finished eleven games in. Every source below is one the site already shows
 * somewhere, and each is read through the viewer's own row-level policies, so
 * a private library or a followers-only list is as absent here as it is
 * everywhere else on the site.
 *
 * The caps are per source. They exist because this is a public route with an
 * eight-second statement budget, not because a bigger year is less
 * interesting: `totals` is counted in the database and is not capped, and the
 * rows are what the page draws with.
 */
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const year = parseWrappedYear(lastSegment(request, "year", /^\d{4}$/));
    if (!year)
      throw new ApiFailure("invalid_request", "That year is not available.");
    const from = `${year}-01-01`;
    const to = `${year + 1}-01-01`;
    const fromTs = `${year}-01-01T00:00:00Z`;
    const toTs = `${year + 1}-01-01T00:00:00Z`;
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 2, "username", HANDLE),
      );
      const id = profile.id;
      const window = [id, fromTs, toTs] as const;
      const [
        { rows: sessions },
        { rows: reviews },
        { rows: library },
        { rows: lists },
        { rows: screenshots },
        { rows: journeys },
        { rows: totals },
      ] = await series(
        () =>
          client.query(
            `select igdb_id,played_on,minutes,marks_finish
               from public.diary_entries
              where profile_id = $1
                and played_on >= $2::date and played_on < $3::date
              order by played_on
              limit 4000`,
            [id, from, to],
          ),
        () =>
          client.query(
            `select igdb_id,rating,created_at from public.reviews
              where profile_id = $1
                and created_at >= $2::timestamptz and created_at < $3::timestamptz
              order by created_at
              limit 1000`,
            [...window],
          ),
        // A library row counts for the year it moved in, whichever way it
        // moved: finished, started, added, or a status changed by hand. This
        // is the source that makes the page work for somebody who logs games
        // without ever writing a session about one.
        () =>
          client.query(
            `select igdb_id,status,quick_rating,liked,started_at,completed_at,
                    (created_at >= $2::timestamptz and created_at < $3::timestamptz) as added
               from public.user_games
              where profile_id = $1
                and (
                  (completed_at >= $4::date and completed_at < $5::date)
                  or (started_at >= $4::date and started_at < $5::date)
                  or (created_at >= $2::timestamptz and created_at < $3::timestamptz)
                  or (updated_at >= $2::timestamptz and updated_at < $3::timestamptz)
                )
              order by coalesce(completed_at, started_at, updated_at::date) desc
              limit 1200`,
            [...window, from, to],
          ),
        () =>
          client.query(
            `select l.public_id,l.name,l.kind,l.created_at,
                    (select count(*) from public.game_list_items i
                      where i.list_id = l.id)::int as items
               from public.game_lists l
              where l.profile_id = $1
                and l.created_at >= $2::timestamptz and l.created_at < $3::timestamptz
              order by l.created_at desc
              limit 60`,
            [...window],
          ),
        () =>
          client.query(
            `select public_id,igdb_id,image_url,width,height,
                    contains_spoilers,sensitive,created_at
               from public.screenshots
              where profile_id = $1
                and created_at >= $2::timestamptz and created_at < $3::timestamptz
              order by created_at desc
              limit 120`,
            [...window],
          ),
        () =>
          client.query(
            `select public_id,igdb_id,title,created_at from public.journeys
              where profile_id = $1
                and created_at >= $2::timestamptz and created_at < $3::timestamptz
              order by created_at desc
              limit 60`,
            [...window],
          ),
        // Counted rather than listed. Each of these already has a page that
        // lists them, and a retrospective only ever says how many.
        () =>
          client.query(
            // `count(*)` is a bigint and the driver hands a bigint back as
            // a string, so each one is cast: "0" is not 0, and every one of
            // these is read as a number by the page.
            `select
               (select count(*) from public.follows
                 where following_id = $1
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as followers,
               (select count(*) from public.follows
                 where follower_id = $1
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as following,
               (select count(*) from public.content_likes
                 where profile_id = $1
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as likes,
               (
                 (select count(*) from public.content_comments
                   where author_id = $1 and deleted_at is null
                     and created_at >= $2::timestamptz and created_at < $3::timestamptz)
                 + (select count(*) from public.profile_comments
                   where author_id = $1 and deleted_at is null
                     and created_at >= $2::timestamptz and created_at < $3::timestamptz)
               )::int as comments,
               (select count(*) from public.mineral_grants
                 where profile_id = $1
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as minerals,
               (select count(*) from public.screenshots
                 where profile_id = $1 and deleted_at is null
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as screenshots,
               (select count(*) from public.game_lists
                 where profile_id = $1
                   and created_at >= $2::timestamptz and created_at < $3::timestamptz
               )::int as lists`,
            [...window],
          ),
      );
      return {
        data: {
          sessions,
          reviews,
          library,
          lists,
          screenshots,
          journeys,
          totals: totals[0] ?? null,
        },
      };
    });
  },
});
