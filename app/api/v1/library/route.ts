import {
  jsonBody,
  optionalBool,
  optionalInt,
  optionalOneOf,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "library.read",
  table: "user_games",
  columns:
    "id, igdb_id, game_slug, status, progress, playtime_minutes, liked, favorite, playing, backlog, wishlist, quick_rating, started_at, completed_at, created_at, updated_at",
  order: "updated_at desc, id desc",
});

const STATUSES = [
  "BACKLOG",
  "PLAYING",
  "COMPLETED",
  "DROPPED",
  "WISHLIST",
] as const;

const FLAGS = ["playing", "backlog", "wishlist", "liked"] as const;

export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const status = optionalOneOf(body, "status", STATUSES);
    const rating = optionalInt(body, "rating", 0, 100);
    const flags = FLAGS.map(
      (flag) => [flag, optionalBool(body, flag)] as const,
    ).filter(([, value]) => value !== null);

    if (!status && rating === null && flags.length === 0)
      throw new ApiFailure(
        "invalid_request",
        "Send at least one of status, rating, playing, backlog, wishlist or liked.",
      );

    return await db(async (client) => {
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

      if (rating !== null)
        await client.query(
          "select public.set_game_rating(game_id => $1, game_slug => $2, rating => $3)",
          [gameId, slug, rating],
        );

      const { rows } = await client.query(
        `select id, igdb_id, game_slug, status, liked, favorite, playing,
                backlog, wishlist, quick_rating, created_at, updated_at
           from public.user_games
          where profile_id = $1 and igdb_id = $2`,
        [identity.profileId, gameId],
      );
      return { data: rows[0] ?? null };
    });
  },
});
