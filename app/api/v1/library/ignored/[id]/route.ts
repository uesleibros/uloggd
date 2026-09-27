import { lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Counts a game again.
 *
 * By id in the path rather than in a body, because a DELETE with a body is a
 * request half the world's proxies and clients quietly drop, and this one is
 * already named by the thing it removes.
 *
 * Nothing else about the game changes, because nothing else ever changed:
 * ignoring is a sentence about the progress bar, not about the library.
 */
export const DELETE = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const raw = lastSegment(request, "game id", /^[0-9]{1,12}$/);
    const gameId = Number(raw);
    if (!Number.isSafeInteger(gameId) || gameId <= 0)
      throw new ApiFailure("invalid_request", "That is not a game id.");
    return await db(async (client) => {
      await client.query(
        "delete from public.ignored_games where profile_id = $1 and igdb_id = $2",
        [identity.profileId, gameId],
      );
      return { data: { igdb_id: gameId, ignored: false } };
    });
  },
});
