import "server-only";

import { serverApi, settleServer } from "@/lib/api-server";

export type CommunityGameRating = {
  rating: number;
  count: number;
};

export async function getCommunityGameRatings(
  gameIds: number[],
): Promise<Map<number, CommunityGameRating>> {
  const uniqueIds = [...new Set(gameIds.filter((id) => id > 0))].slice(0, 200);
  if (!uniqueIds.length) return new Map<number, CommunityGameRating>();

  const { data: response } = await settleServer(
    serverApi.get<{
      data: { igdb_id: number; rating: number; rating_count: number }[];
    }>("/games/ratings?ids=" + uniqueIds.join(",")),
  );
  const data = response?.data;
  return new Map(
    (data ?? []).map(
      (row: { igdb_id: number; rating: number; rating_count: number }) =>
        [
          row.igdb_id,
          { rating: Number(row.rating), count: Number(row.rating_count) },
        ] as const,
    ),
  );
}
