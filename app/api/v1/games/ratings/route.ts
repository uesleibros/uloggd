import { apiRoute } from "@/lib/api/route";
import { gameIds } from "@/lib/api/game-ids";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "catalog.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const ids = gameIds(request);
    return db(async (client) => ({
      data: (
        await client.query(
          "select * from public.get_community_game_ratings(game_ids => $1::integer[])",
          [ids],
        )
      ).rows,
    }));
  },
});
