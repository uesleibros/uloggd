import { z } from "zod";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { getGamesByIds } from "@/lib/igdb";
import { publicGame } from "@/lib/api/shapes";
import { readProfile } from "@/lib/api/profile-read";
import { segmentBefore, HANDLE } from "@/lib/api/path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const query = z.object({
  page: z.coerce.number().int().min(1).max(200).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

/**
 * Somebody's playthroughs, newest first.
 *
 * A journey is a pass through a game: its own state, dates, difficulty, how
 * far it got and the copy it was played on. The reviews page could show what
 * somebody wrote and the sessions they logged, and not the runs those
 * sessions belong to, which is the one shape that holds the other two
 * together.
 *
 * Through `journey_overview`, which is where the visibility rule lives: a run
 * is as visible as what is inside it, and always visible to its author. A
 * stranger reading this sees the runs with something public in them and the
 * totals of that public part, never more.
 */
export const GET = apiRoute({
  public: true,
  scope: "journal.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiFailure("invalid_request", "Invalid journey filters.");
    const { page, limit } = parsed.data;

    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      const { rows } = await client.query(
        `select * from public.journey_overview(
           owner => $1, page_limit => $2, page_offset => $3)`,
        [profile.id, limit + 1, (page - 1) * limit],
      );
      const more = rows.length > limit;
      const data = more ? rows.slice(0, limit) : rows;
      // The covers in one read: a page of runs is a handful of games, and
      // asking per row is the N+1 every list here avoids.
      const games = await getGamesByIds(data.map((row) => Number(row.igdb_id)));
      return {
        data,
        games: games.map(publicGame),
        page: { number: page, size: limit, has_more: more },
      };
    });
  },
});
