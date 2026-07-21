import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import type { ListPreview } from "@/lib/lists-types";

export type { ListPreview };

// Hydrates only the five cover games each card actually shows, instead of
// every item of every list.
export async function getListPreviews(
  supabase: SupabaseClient,
  options: {
    ownerId: string;
    viewerId?: string | null;
    publicOnly?: boolean;
    before?: string;
    limit?: number;
    query?: string;
  },
): Promise<ListPreview[]> {
  const limit = options.limit ?? 24;
  let query = supabase
    .from("game_lists")
    .select(
      "id,name,description,visibility,updated_at,game_list_items(igdb_id,position)",
    )
    .eq("profile_id", options.ownerId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (options.publicOnly) query = query.eq("visibility", "PUBLIC");
  if (options.before) query = query.lt("updated_at", options.before);
  if (options.query) {
    // Escape the LIKE wildcards so a name containing % or _ still matches
    // literally instead of turning into a pattern.
    const safe = options.query.replace(/[%_\\]/g, (char) => `\\${char}`);
    query = query.ilike("name", `%${safe}%`);
  }
  const { data: lists } = await query;
  if (!lists?.length) return [];

  const itemsByList = lists.map((list) =>
    [...list.game_list_items].sort((a, b) => a.position - b.position),
  );
  const coverIds = [
    ...new Set(
      itemsByList.flatMap((items) => items.slice(0, 5).map((i) => i.igdb_id)),
    ),
  ];
  const viewerId = options.viewerId ?? null;
  const { data: viewerPreference } =
    viewerId && viewerId !== options.ownerId
      ? await supabase
          .from("profiles")
          .select("custom_cover_scope")
          .eq("id", viewerId)
          .maybeSingle()
      : { data: null };
  const showCreatorCovers =
    viewerId === options.ownerId ||
    viewerPreference?.custom_cover_scope === "EVERYONE";
  const [games, { data: savedCovers }, { data: likeRows }] = await Promise.all([
    getGamesByIds(coverIds),
    coverIds.length && showCreatorCovers
      ? supabase
          .from("user_games")
          .select("igdb_id,custom_cover_url")
          .eq("profile_id", options.ownerId)
          .in("igdb_id", coverIds)
      : Promise.resolve({
          data: [] as { igdb_id: number; custom_cover_url: string | null }[],
        }),
    supabase.rpc("get_content_likes", {
      target_type: "list",
      target_ids: lists.map((list) => list.id),
    }),
  ]);
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const customById = new Map(
    (savedCovers ?? []).map((item) => [item.igdb_id, item.custom_cover_url]),
  );
  const likesById = new Map(
    ((likeRows ?? []) as { content_id: string; like_count: number }[]).map(
      (row) => [row.content_id, Number(row.like_count)],
    ),
  );
  return lists.map((list, index) => {
    const items = itemsByList[index];
    return {
      id: list.id,
      name: list.name,
      description: list.description,
      visibility: list.visibility as ListPreview["visibility"],
      count: items.length,
      covers: items.slice(0, 5).flatMap((item) => {
        const game = gamesById.get(item.igdb_id);
        return game
          ? [
              {
                url: resolveGameCover(game.coverUrl, customById.get(game.id)),
                name: game.name,
              },
            ]
          : [];
      }),
      likes: likesById.get(list.id) ?? 0,
      updatedAt: list.updated_at,
    };
  });
}
