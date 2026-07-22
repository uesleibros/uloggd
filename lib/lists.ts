import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import {
  LIST_PAGE_SIZE,
  type ListFilters,
  type ListPreview,
  type ListSort,
} from "@/lib/lists-types";

export type { ListPreview };

type PreviewOptions = ListFilters & {
  ownerId: string;
  viewerId?: string | null;
  publicOnly?: boolean;
  limit?: number;
  offset?: number;
  // Cursor pagination for the profile subpages (updated_at ordering only).
  before?: string;
  query?: string;
};

// Hydrates only the five cover games each card actually shows, instead of
// every item of every list.
export async function getListPreviews(
  supabase: SupabaseClient,
  options: PreviewOptions,
): Promise<ListPreview[]> {
  const limit = options.limit ?? LIST_PAGE_SIZE;
  const offset = Math.max(0, options.offset ?? 0);
  const sort: ListSort = options.sort ?? "recent";
  const visibility = options.visibility ?? "ALL";
  const mode = options.mode ?? "ALL";
  let query = supabase
    .from("game_lists")
    .select(
      "id,public_id,name,description,visibility,ranked,updated_at,game_list_items(igdb_id,position)",
    )
    .eq("profile_id", options.ownerId);
  if (options.publicOnly) query = query.eq("visibility", "PUBLIC");
  else if (visibility !== "ALL") query = query.eq("visibility", visibility);
  if (mode !== "ALL") query = query.eq("ranked", mode === "RANKED");
  if (options.query) {
    // Escape the LIKE wildcards so a name containing % or _ still matches
    // literally instead of turning into a pattern.
    const safe = options.query.replace(/[%_\\]/g, (char) => `\\${char}`);
    query = query.ilike("name", `%${safe}%`);
  }
  // "size" and "likes" are sorted client-side after the page loads because the
  // count lives inside the child rows and likes come from a separate RPC.
  if (sort === "recent" || sort === "size" || sort === "likes")
    query = query.order("updated_at", { ascending: false });
  else if (sort === "oldest")
    query = query.order("updated_at", { ascending: true });
  else if (sort === "name") query = query.order("name", { ascending: true });
  if (options.before) query = query.lt("updated_at", options.before);
  query = query.range(offset, offset + limit - 1);
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
  const previews: ListPreview[] = lists.map((list, index) => {
    const items = itemsByList[index];
    return {
      id: list.id,
      publicId: list.public_id,
      name: list.name,
      description: list.description,
      visibility: list.visibility as ListPreview["visibility"],
      ranked: Boolean(list.ranked),
      count: items.length,
      covers: items.slice(0, 5).flatMap((item) => {
        const game = gamesById.get(item.igdb_id);
        return game
          ? [
              {
                url: resolveGameCover(game.coverUrl, customById.get(game.id)),
                fallbackUrl: game.coverUrl,
                name: game.name,
              },
            ]
          : [];
      }),
      likes: likesById.get(list.id) ?? 0,
      updatedAt: list.updated_at,
    };
  });
  if (sort === "size") previews.sort((a, b) => b.count - a.count);
  else if (sort === "likes") previews.sort((a, b) => b.likes - a.likes);
  return previews;
}

// Returns the count that matches the current filter set, so pagination and the
// header total stay in sync with what the grid actually renders.
export async function getListsCount(
  supabase: SupabaseClient,
  options: Pick<PreviewOptions, "ownerId" | "publicOnly" | "visibility" | "mode" | "query">,
): Promise<number> {
  let query = supabase
    .from("game_lists")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", options.ownerId);
  if (options.publicOnly) query = query.eq("visibility", "PUBLIC");
  else if (options.visibility && options.visibility !== "ALL")
    query = query.eq("visibility", options.visibility);
  if (options.mode && options.mode !== "ALL")
    query = query.eq("ranked", options.mode === "RANKED");
  if (options.query) {
    const safe = options.query.replace(/[%_\\]/g, (char) => `\\${char}`);
    query = query.ilike("name", `%${safe}%`);
  }
  const { count } = await query;
  return count ?? 0;
}
