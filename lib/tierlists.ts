import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds, type Game } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";

export type TierlistTier = {
  id: string;
  label: string;
  color: string;
  position: number;
};

export type TierlistGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string;
  fallbackUrl: string;
  releaseTimestamp: number | null;
};

export type TierlistItem = TierlistGame & { tierId: string; position: number };

export type TierlistData = {
  tiers: TierlistTier[];
  items: TierlistItem[];
  /** Owner's library games not placed in any tier — the editor's pool. */
  pool: TierlistGame[];
  /** Distinct games actually shown, after the library filter. */
  rankedCount: number;
};

type TierRow = { id: string; label: string; color: string; position: number };
type ItemRow = {
  tier_id: string;
  igdb_id: number;
  game_slug: string;
  position: number;
};

/**
 * Reads a tierlist and reconciles it with the owner's current library. A game
 * that has left the library is dropped from the board even if it still sits in
 * a tier row, and the leftover library games become the pool. `includePool` is
 * off for public viewers, who never see the owner's unranked library.
 */
export async function getTierlist(
  supabase: SupabaseClient,
  listId: string,
  ownerId: string,
  options: { includePool: boolean } = { includePool: false },
): Promise<TierlistData> {
  const [
    { data: tierRows },
    { data: itemRows },
    { data: liveIds },
    poolResult,
  ] = await Promise.all([
    supabase
      .from("tierlist_tiers")
      .select("id,label,color,position")
      .eq("list_id", listId)
      .order("position", { ascending: true }),
    supabase
      .from("tierlist_items")
      .select("tier_id,igdb_id,game_slug,position")
      .eq("list_id", listId),
    // Reconciled with the owner's library through a definer function, so a
    // private library never blanks a public board for a viewer.
    supabase.rpc("tierlist_live_ids", { target_list: listId }),
    // Only the owner sees the pool, and only the owner can read their own
    // full library under RLS.
    options.includePool
      ? supabase.from("user_games").select("igdb_id").eq("profile_id", ownerId)
      : Promise.resolve({ data: null as { igdb_id: number }[] | null }),
  ]);

  const tiers: TierlistTier[] = (tierRows ?? []) as TierRow[];
  const items = (itemRows ?? []) as ItemRow[];
  const libraryIds = new Set<number>(
    ((liveIds ?? []) as (number | { igdb_id: number })[]).map((row) =>
      typeof row === "number" ? row : row.igdb_id,
    ),
  );
  const libraryGames = (poolResult.data ?? []) as { igdb_id: number }[];

  const liveItems = items.filter((item) => libraryIds.has(item.igdb_id));
  const tieredIds = new Set(liveItems.map((item) => item.igdb_id));
  const poolIds = options.includePool
    ? libraryGames
        .map((game) => game.igdb_id)
        .filter((id) => !tieredIds.has(id))
    : [];

  const allIds = [...new Set([...liveItems.map((i) => i.igdb_id), ...poolIds])];
  const games = await getGamesByIds(allIds);
  const byId = new Map(games.map((game) => [game.id, game]));
  const toGame = (id: number, slug: string): TierlistGame | null => {
    const game: Game | undefined = byId.get(id);
    if (!game) return null;
    return {
      igdbId: id,
      slug: game.slug || slug,
      name: game.name,
      coverUrl: resolveGameCover(game.coverUrl, null),
      fallbackUrl: game.coverUrl,
      releaseTimestamp: game.releaseTimestamp,
    };
  };

  const resolvedItems = liveItems.flatMap((item) => {
    const game = toGame(item.igdb_id, item.game_slug);
    return game
      ? [{ ...game, tierId: item.tier_id, position: item.position }]
      : [];
  });
  resolvedItems.sort((a, b) => a.position - b.position);

  const pool = poolIds
    .flatMap((id) => {
      const game = byId.get(id);
      return game ? [toGame(id, game.slug)!] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    tiers,
    items: resolvedItems,
    pool,
    rankedCount: new Set(resolvedItems.map((item) => item.igdbId)).size,
  };
}

export type TierlistPreviewRow = {
  color: string;
  covers: { url: string; fallbackUrl: string }[];
};

/**
 * A miniature of the board for the collection card: the top tiers as coloured
 * rows with a few covers each, plus the ranked count. Only games still in the
 * owner's library appear, matching what the board itself shows. Empty tiers are
 * dropped so a tiny card never shows blank rows.
 */
export async function getTierlistPreview(
  supabase: SupabaseClient,
  listId: string,
  { maxTiers = 4, maxCoversPerTier = 6 } = {},
): Promise<{ rows: TierlistPreviewRow[]; count: number }> {
  const [{ data: tierRows }, { data: itemRows }, { data: liveIds }] =
    await Promise.all([
      supabase
        .from("tierlist_tiers")
        .select("id,color,position")
        .eq("list_id", listId)
        .order("position", { ascending: true }),
      supabase
        .from("tierlist_items")
        .select("tier_id,igdb_id,position")
        .eq("list_id", listId),
      // Same definer path as the board: reconciled with the owner's reach so a
      // private library still previews on a public list.
      supabase.rpc("tierlist_live_ids", { target_list: listId }),
    ]);
  const inLibrary = new Set(
    ((liveIds ?? []) as (number | { igdb_id: number })[]).map((row) =>
      typeof row === "number" ? row : row.igdb_id,
    ),
  );
  const tiers = (tierRows ?? []) as {
    id: string;
    color: string;
    position: number;
  }[];
  const byTier = new Map<string, number[]>();
  for (const item of ((itemRows ?? []) as ItemRow[])
    .filter((item) => inLibrary.has(item.igdb_id))
    .sort((a, b) => a.position - b.position)) {
    const bucket = byTier.get(item.tier_id);
    if (bucket) bucket.push(item.igdb_id);
    else byTier.set(item.tier_id, [item.igdb_id]);
  }

  const count = new Set([...byTier.values()].flat()).size;

  // Only tiers that actually have games, top-down, capped for the card.
  const shownTiers = tiers
    .filter((tier) => (byTier.get(tier.id)?.length ?? 0) > 0)
    .slice(0, maxTiers)
    .map((tier) => ({
      color: tier.color,
      ids: (byTier.get(tier.id) ?? []).slice(0, maxCoversPerTier),
    }));

  const allIds = [...new Set(shownTiers.flatMap((tier) => tier.ids))];
  if (!allIds.length) return { rows: [], count };
  const games = await getGamesByIds(allIds);
  const byId = new Map(games.map((game) => [game.id, game]));
  const rows: TierlistPreviewRow[] = shownTiers.map((tier) => ({
    color: tier.color,
    covers: tier.ids.flatMap((id) => {
      const game = byId.get(id);
      return game
        ? [
            {
              url: resolveGameCover(game.coverUrl, null),
              fallbackUrl: game.coverUrl,
            },
          ]
        : [];
    }),
  }));
  return { rows, count };
}
