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
import {
  isMissingSchemaError,
  warnSchemaGap,
} from "@/lib/supabase/schema-fallback";
import { getTierlistPreview } from "@/lib/tierlists";

export type { ListPreview };

// `ranked` arrives with the ranked_lists migration. Until that runs every list
// is a collection, so the queries below drop the column instead of failing.
const LIST_COLUMNS = "id,public_id,name,description,visibility,kind,updated_at";
const LIST_ITEMS = "game_list_items(igdb_id,position)";

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
  const build = (withRanked: boolean) => {
    let query = supabase
      .from("game_lists")
      .select(
        withRanked
          ? `${LIST_COLUMNS},ranked,${LIST_ITEMS}`
          : `${LIST_COLUMNS},${LIST_ITEMS}`,
      )
      .eq("profile_id", options.ownerId);
    if (options.publicOnly) query = query.eq("visibility", "PUBLIC");
    else if (visibility !== "ALL") query = query.eq("visibility", visibility);
    if (withRanked && mode !== "ALL")
      query = query.eq("ranked", mode === "RANKED");
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
    return query.range(offset, offset + limit - 1);
  };

  type ListRow = {
    id: string;
    public_id: string;
    name: string;
    description: string | null;
    visibility: string;
    ranked?: boolean | null;
    kind?: string | null;
    updated_at: string;
    game_list_items: { igdb_id: number; position: number }[];
  };
  const first = (await build(true)) as {
    data: ListRow[] | null;
    error: { code?: string | null; message?: string | null } | null;
  };
  let lists = first.data;
  if (isMissingSchemaError(first.error)) {
    warnSchemaGap("game_lists.ranked", first.error);
    // Without the column nothing is ranked, so a RANKED filter matches nothing
    // and COLLECTION matches everything.
    if (mode === "RANKED") return [];
    ({ data: lists } = (await build(false)) as { data: ListRow[] | null });
  }
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
      kind: list.kind === "TIERLIST" ? "TIERLIST" : "COLLECTION",
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

  // A tierlist keeps its games in a separate table, so its covers and count
  // come from there. Only the few on this page are hydrated, tier by tier.
  const tierlistPreviews = previews.filter(
    (preview) => preview.kind === "TIERLIST",
  );
  if (tierlistPreviews.length) {
    const filled = await Promise.all(
      tierlistPreviews.map((preview) =>
        getTierlistPreview(supabase, preview.id),
      ),
    );
    tierlistPreviews.forEach((preview, index) => {
      preview.covers = filled[index].covers;
      preview.count = filled[index].count;
    });
  }

  if (sort === "size") previews.sort((a, b) => b.count - a.count);
  else if (sort === "likes") previews.sort((a, b) => b.likes - a.likes);
  return previews;
}

// Returns the count that matches the current filter set, so pagination and the
// header total stay in sync with what the grid actually renders.
export async function getListsCount(
  supabase: SupabaseClient,
  options: Pick<
    PreviewOptions,
    "ownerId" | "publicOnly" | "visibility" | "mode" | "query"
  >,
): Promise<number> {
  const build = (withRanked: boolean) => {
    let query = supabase
      .from("game_lists")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", options.ownerId);
    if (options.publicOnly) query = query.eq("visibility", "PUBLIC");
    else if (options.visibility && options.visibility !== "ALL")
      query = query.eq("visibility", options.visibility);
    if (withRanked && options.mode && options.mode !== "ALL")
      query = query.eq("ranked", options.mode === "RANKED");
    if (options.query) {
      const safe = options.query.replace(/[%_\\]/g, (char) => `\\${char}`);
      query = query.ilike("name", `%${safe}%`);
    }
    return query;
  };
  const first = await build(true);
  let count = first.count;
  if (isMissingSchemaError(first.error)) {
    warnSchemaGap("game_lists.ranked (count)", first.error);
    if (options.mode === "RANKED") return 0;
    ({ count } = await build(false));
  }
  return count ?? 0;
}
