import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type CommunityGameRating = {
  rating: number;
  count: number;
};

export async function getCommunityGameRatings(
  supabase: SupabaseClient,
  gameIds: number[],
): Promise<Map<number, CommunityGameRating>> {
  const uniqueIds = [...new Set(gameIds.filter((id) => id > 0))].slice(0, 200);
  if (!uniqueIds.length) return new Map<number, CommunityGameRating>();

  const { data, error } = await supabase.rpc("get_community_game_ratings", {
    game_ids: uniqueIds,
  });
  if (error) {
    console.warn("[community-ratings] aggregate unavailable", {
      code: error.code,
      requested: uniqueIds.length,
    });
    return new Map<number, CommunityGameRating>();
  }

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
