import {
  clearing,
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalStep,
  optionalText,
} from "@/lib/api/body";
import { GAME_STATUSES } from "@/lib/api/enums";
import { lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLAGS = ["playing", "backlog", "wishlist", "liked"] as const;

const ENTRY = `id, igdb_id, game_slug, status, liked, favorite, playing,
  backlog, wishlist, quick_rating, custom_cover_url, created_at, updated_at`;

/**
 * Changes one game already in the library.
 *
 * POST /library is the way in and takes the slug, because a game that is not
 * there yet has no row to read it from. Here the row exists, so the slug comes
 * from it rather than from the caller, and a request cannot claim a game is
 * something it is not.
 */
export const PATCH = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const gameId = Number(lastSegment(request, "game id", /^\d{1,12}$/));
    const body = await jsonBody(request);

    const status = optionalOneOf(body, "status", GAME_STATUSES);
    const rating = optionalStep(body, "rating", 10, 100, 10);
    const clearRating = clearing(body, "rating");
    const cover = optionalText(body, "cover_url", 2048);
    const flags = FLAGS.map(
      (flag) => [flag, optionalBool(body, flag)] as const,
    ).filter(([, value]) => value !== null);

    if (
      status === null &&
      rating === null &&
      !clearRating &&
      cover === null &&
      !flags.length
    )
      throw new ApiFailure(
        "invalid_request",
        "Send at least one of status, rating, cover_url, playing, backlog, wishlist or liked.",
      );

    return await db(async (client) => {
      const { rows: owned } = await client.query<{ game_slug: string }>(
        "select game_slug from public.user_games where profile_id = $1 and igdb_id = $2",
        [identity.profileId, gameId],
      );
      if (!owned[0])
        throw new ApiFailure("not_found", "That game is not in your library.");
      const slug = owned[0].game_slug;

      if (status)
        await client.query(
          `select public.set_game_card_action(
             game_id => $1, game_slug => $2, action_name => 'status',
             action_value => null, game_status => $3::public."GameStatus")`,
          [gameId, slug, status],
        );

      for (const [flag, value] of flags)
        await client.query(
          `select public.set_game_card_action(
             game_id => $1, game_slug => $2, action_name => $3,
             action_value => $4, game_status => null)`,
          [gameId, slug, flag, value],
        );

      if (rating !== null || clearRating)
        await client.query(
          "select public.set_game_rating(game_id => $1, game_slug => $2, rating => $3)",
          [gameId, slug, rating],
        );

      if (cover !== null)
        await client.query(
          `select public.set_game_custom_cover(
             game_id => $1, game_slug => $2, cover_url => $3)`,
          [gameId, slug, cover],
        );

      const { rows } = await client.query(
        `select ${ENTRY} from public.user_games
          where profile_id = $1 and igdb_id = $2`,
        [identity.profileId, gameId],
      );
      return { data: rows[0] ?? null };
    });
  },
});

export const DELETE = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const raw = lastSegment(request, "game id", /^\d{1,12}$/);
    const gameId = Number(raw);

    return await db(async (client) => {
      const { rows: before } = await client.query(
        "select id from public.user_games where profile_id = $1 and igdb_id = $2",
        [identity.profileId, gameId],
      );
      if (!before[0])
        throw new ApiFailure("not_found", "That game is not in your library.");

      await client.query(
        "select public.remove_game_from_library(game_id => $1)",
        [gameId],
      );
      return { data: { igdb_id: gameId, deleted: true } };
    });
  },
});
