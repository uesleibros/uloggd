import {
  clearing,
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalStep,
  optionalText,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { GAME_STATUSES } from "@/lib/api/enums";
import { ownedCollection } from "@/lib/api/collection";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "library.read",
  table: "user_games",
  columns:
    "id, igdb_id, game_slug, status, progress, playtime_minutes, liked, favorite, playing, backlog, wishlist, quick_rating, custom_cover_url, started_at, completed_at, created_at, updated_at",
  order: "updated_at desc, id desc",
});

const FLAGS = ["playing", "backlog", "wishlist", "liked"] as const;

export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const status = optionalOneOf(body, "status", GAME_STATUSES);
    // Turning a status off, rather than naming a replacement for it. A card
    // that unchecked "played" used to send BACKLOG, which is how a wishlisted
    // game came back from one click as backlog: the row now remembers what it
    // was and this is what asks for it back.
    const clearStatus = optionalOneOf(body, "clear_status", GAME_STATUSES);
    const rating = optionalStep(body, "rating", 10, 100, 10);
    const clearRating = clearing(body, "rating");
    // The way in for a cover too. Choosing how a game looks to you is
    // something you say about a game you may not have tracked yet, and the
    // game page offers it beside the rating, which has always come through
    // here and created the row it needed.
    const cover = optionalText(body, "cover_url", 2048);
    const flags = FLAGS.map(
      (flag) => [flag, optionalBool(body, flag)] as const,
    ).filter(([, value]) => value !== null);

    if (
      !status &&
      !clearStatus &&
      rating === null &&
      !clearRating &&
      cover === null &&
      flags.length === 0
    )
      throw new ApiFailure(
        "invalid_request",
        "Send at least one of status, clear_status, rating, cover_url, playing, backlog, wishlist or liked.",
      );

    return await db(async (client) => {
      if (status)
        await client.query(
          `select public.set_game_card_action(
             game_id => $1, game_slug => $2, action_name => 'status',
             action_value => null, game_status => $3::public."GameStatus")`,
          [gameId, slug, status],
        );

      if (clearStatus)
        await client.query(
          `select public.set_game_card_action(
             game_id => $1, game_slug => $2, action_name => 'status',
             action_value => false, game_status => $3::public."GameStatus")`,
          [gameId, slug, clearStatus],
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
        `select id, igdb_id, game_slug, status, liked, favorite, playing,
                backlog, wishlist, quick_rating, custom_cover_url, created_at,
                updated_at
           from public.user_games
          where profile_id = $1 and igdb_id = $2`,
        [identity.profileId, gameId],
      );
      return { data: rows[0] ?? null };
    });
  },
});
