import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getForYouGames as igdbForYouGames,
  getGamesByIds,
  type Game,
} from "@/lib/igdb";

// View history reads. Writes go through the record_content_view RPC; here we
// pull the most recent items back out (RLS already scopes them to the viewer)
// and hydrate the game ones from IGDB.

export async function getRecentGameIds(
  supabase: SupabaseClient,
  viewerId: string,
  limit = 20,
): Promise<number[]> {
  const { data } = await supabase
    .from("content_views")
    .select("game_igdb_id")
    .eq("viewer_id", viewerId)
    .eq("content_type", "game")
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .map((row) => row.game_igdb_id as number | null)
    .filter((id): id is number => typeof id === "number");
}

export async function getRecentProfileIds(
  supabase: SupabaseClient,
  viewerId: string,
  limit = 12,
): Promise<string[]> {
  const { data } = await supabase
    .from("content_views")
    .select("target_profile_id")
    .eq("viewer_id", viewerId)
    .eq("content_type", "profile")
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .map((row) => row.target_profile_id as string | null)
    .filter((id): id is string => typeof id === "string");
}

export async function getRecentListIds(
  supabase: SupabaseClient,
  viewerId: string,
  limit = 12,
): Promise<string[]> {
  const { data } = await supabase
    .from("content_views")
    .select("list_id")
    .eq("viewer_id", viewerId)
    .eq("content_type", "list")
    .order("viewed_at", { ascending: false })
    .limit(limit);
  return (data ?? [])
    .map((row) => row.list_id as string | null)
    .filter((id): id is string => typeof id === "string");
}

/** Recently viewed games, hydrated from IGDB, kept in most-recent-first order. */
export async function getRecentlyViewedGames(
  supabase: SupabaseClient,
  viewerId: string,
  limit = 12,
): Promise<Game[]> {
  const ids = await getRecentGameIds(supabase, viewerId, limit);
  if (!ids.length) return [];
  const games = await getGamesByIds(ids);
  const byId = new Map(games.map((game) => [game.id, game]));
  return ids
    .map((id) => byId.get(id))
    .filter((game): game is Game => Boolean(game));
}

async function getOwnedGameIds(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<number[]> {
  const { data } = await supabase
    .from("user_games")
    .select("igdb_id")
    .eq("profile_id", viewerId);
  return (data ?? [])
    .map((row) => row.igdb_id as number | null)
    .filter((id): id is number => typeof id === "number");
}

/**
 * "For you": recommendations from the genres of what the viewer has been
 * looking at, minus games already in their library. Needs a bit of history to
 * say anything, so it returns empty for brand-new viewers.
 */
export async function getForYouGames(
  supabase: SupabaseClient,
  viewerId: string,
): Promise<Game[]> {
  const [recentIds, ownedIds] = await Promise.all([
    getRecentGameIds(supabase, viewerId, 30),
    getOwnedGameIds(supabase, viewerId),
  ]);
  if (recentIds.length < 2) return [];
  return igdbForYouGames(recentIds, ownedIds);
}
