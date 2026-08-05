import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfileLevels, type ProfileLevel } from "@/lib/profile-level";
import {
  orderNeighbours,
  type NeighbourProfile,
  type RankedNeighbour,
} from "@/lib/taste-neighbours-order";

/**
 * People to meet, drawn from libraries rather than from the follow graph.
 *
 * The graph is the thing that is stuck: fifty-nine edges across twenty-eight
 * accounts, and three accounts holding a hundred and forty-eight, a hundred
 * and ten and eighty-nine games have no followers and follow nobody.
 * Recommending friends of friends to somebody with no friends returns
 * nothing, so the input here is the overlap between libraries, which fourteen
 * of the nineteen have.
 *
 * The ranking and every privacy rule live in `public.taste_neighbours`, which
 * runs as the caller so that row level security decides what may be counted.
 * This module only fetches and joins.
 */

export type { TasteNeighbour } from "@/lib/taste-neighbours-order";

/** Enough to fill a shelf without turning the page into a directory. */
const SHELF_LIMIT = 12;

export async function getTasteNeighbours(
  supabase: SupabaseClient,
  limit = SHELF_LIMIT,
): Promise<{
  neighbours: ReturnType<typeof orderNeighbours>;
  levels: Map<string, ProfileLevel>;
}> {
  const { data } = await supabase.rpc("taste_neighbours", { max_rows: limit });
  const ranked = (data ?? []) as RankedNeighbour[];
  if (!ranked.length) return { neighbours: [], levels: new Map() };

  const ids = ranked.map((row) => row.profile_id);
  // Two reads of the same id list, so they go together. Only the ranking had
  // to happen first, and it already did.
  const [{ data: profiles }, levels] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url,bio,verified,account_type")
      .in("id", ids),
    getProfileLevels(supabase, ids),
  ]);

  return {
    neighbours: orderNeighbours(ranked, (profiles ?? []) as NeighbourProfile[]),
    levels,
  };
}
