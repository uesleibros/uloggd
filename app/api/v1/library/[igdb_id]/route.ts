import { lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
