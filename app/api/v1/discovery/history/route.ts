import { apiRoute } from "@/lib/api/route";
import { getForYouGames, getGamesByIds, type Game } from "@/lib/igdb";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ db, identity }) => {
    const data = await db(
      async (client) =>
        (
          await client.query<{ recent: number[]; owned: number[] }>(
            `select
 array(select game_igdb_id from public.content_views where viewer_id=$1 and content_type='game' and game_igdb_id is not null order by viewed_at desc limit 30) as recent,
 array(select igdb_id from public.user_games where profile_id=$1) as owned`,
            [identity.profileId],
          )
        ).rows[0],
    );
    const [games, forYou] = await Promise.all([
      getGamesByIds(data.recent.slice(0, 12)),
      data.recent.length >= 2
        ? getForYouGames(data.recent, data.owned)
        : Promise.resolve([]),
    ]);
    const byId = new Map(games.map((game) => [game.id, game]));
    return {
      data: {
        recentlyViewed: data.recent
          .slice(0, 12)
          .map((id) => byId.get(id))
          .filter((game): game is Game => !!game),
        forYou,
      },
    };
  },
});
