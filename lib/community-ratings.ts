import "server-only";

import { serverApi, settleServer } from "@/lib/api-server";

export type CommunityGameRating = {
  /** What people gave it, which is the number to show somebody. */
  rating: number;
  count: number;
  /**
   * The same average pulled towards the site's mean by how little is known,
   * which is the number to rank by. With four votes an average is mostly
   * noise, and a game nobody has played should not top a list beside the
   * ones everybody has.
   */
  weighted: number;
};

export async function getCommunityGameRatings(
  gameIds: number[],
): Promise<Map<number, CommunityGameRating>> {
  const uniqueIds = [...new Set(gameIds.filter((id) => id > 0))].slice(0, 200);
  if (!uniqueIds.length) return new Map<number, CommunityGameRating>();

  const { data: response } = await settleServer(
    serverApi.get<{
      data: {
        igdb_id: number;
        rating: number;
        rating_count: number;
        weighted_rating: number;
      }[];
    }>("/games/ratings?ids=" + uniqueIds.join(",")),
  );
  const data = response?.data;
  return new Map(
    (data ?? []).map(
      (row) =>
        [
          row.igdb_id,
          {
            rating: Number(row.rating),
            count: Number(row.rating_count),
            weighted: Number(row.weighted_rating ?? row.rating),
          },
        ] as const,
    ),
  );
}
