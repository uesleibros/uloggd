import {
  jsonBody,
  optionalText,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The games the caller has decided not to play.
 *
 * A series progress bar says "7 of 30", and some of those thirty are a
 * Satellaview broadcast that no longer exists, a phone game whose servers
 * closed, or one somebody simply does not want. Counting those for ever makes
 * the number a lie in the direction that feels worst: it says you are behind
 * on something you cannot reach.
 *
 * Not "dropped", which is a game played and stopped, and not a wishlist
 * upside down. It is "this one is not mine to play", and it is nobody else's
 * business: there is no way to read another person's.
 */
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: ({ request, identity, db }) => {
    const asked = new URL(request.url).searchParams.get("games");
    // A handful of ids, for a page that is about to draw exactly those: a
    // series row asks about its own thirty rather than about a whole shelf.
    const wanted = (asked ?? "")
      .split(",")
      .map((one) => Number(one.trim()))
      .filter((one) => Number.isSafeInteger(one) && one > 0)
      .slice(0, 200);

    return db(async (client) => {
      const { rows } = await client.query(
        `select igdb_id, game_slug, note, created_at
           from public.ignored_games
          where profile_id = $1
            and ($2::integer[] = '{}' or igdb_id = any($2::integer[]))
          order by created_at desc`,
        [identity.profileId, wanted],
      );
      return { data: rows };
    });
  },
});

/**
 * Ignores a game, or changes the note on one already ignored.
 *
 * An upsert, because pressing the same button twice means the same thing both
 * times and a second row would be a second opinion about one game.
 */
export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const note = optionalText(body, "note", 140);

    return await db(async (client) => {
      const { rows } = await client.query(
        `insert into public.ignored_games (profile_id, igdb_id, game_slug, note)
         values ($1, $2, $3, $4)
         on conflict (profile_id, igdb_id)
           do update set note = coalesce(excluded.note, public.ignored_games.note)
         returning igdb_id, game_slug, note, created_at`,
        [identity.profileId, gameId, slug, note],
      );
      return { data: rows[0] };
    });
  },
});
