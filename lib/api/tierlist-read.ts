import "server-only";
import type { PoolClient } from "pg";
import { readRows } from "./read";
import { getGamesByIds, type Game } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { series } from "./series";

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
  /** Owner's library games not placed in any tier, the editor's pool. */
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
  client: PoolClient,
  listId: string,
  ownerId: string,
  options: { includePool: boolean } = { includePool: false },
): Promise<TierlistData> {
  const [
    { data: tierRows },
    { data: itemRows },
    { data: liveIds },
    poolResult,
  ] = await series(
    () =>
      readRows(
        client,
        "select id,label,color,position from public.tierlist_tiers where list_id = $1 order by position",
        [listId],
      ),
    () =>
      readRows(
        client,
        "select tier_id,igdb_id,game_slug,position from public.tierlist_items where list_id = $1",
        [listId],
      ),
    () =>
      // Reconciled with the owner's library through a definer function, so a
      // private library never blanks a public board for a viewer.
      readRows(
        client,
        "select public.tierlist_live_ids(target_list => $1) as igdb_id",
        [listId],
      ),
    () =>
      // Only the owner sees the pool, and only the owner can read their own
      // full library under RLS.
      options.includePool
        ? readRows(
            client,
            "select igdb_id from public.user_games where profile_id = $1",
            [ownerId],
          )
        : Promise.resolve({ data: null as { igdb_id: number }[] | null }),
  );

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
  label: string;
  color: string;
  covers: { url: string; fallbackUrl: string }[];
};

/**
 * Miniatures of several boards for the collection cards: each one's top tiers
 * as coloured rows with a few covers, plus its ranked count. Only games still
 * in the owner's library appear, matching what the board itself shows, and
 * empty tiers are dropped so a tiny card never shows blank rows.
 *
 * All the boards in one pass. This took one list at a time, three queries
 * each and a catalogue lookup, and a page of tierlist results waited on
 * seventy-two round trips in a row: measured, the tierlist search took over
 * three seconds to settle. Three queries and one lookup now, however many
 * boards are on the page.
 */
export async function getTierlistPreviews(
  client: PoolClient,
  listIds: string[],
  { maxTiers = 4, maxCoversPerTier = 6 } = {},
): Promise<Map<string, { rows: TierlistPreviewRow[]; count: number }>> {
  const previews = new Map<
    string,
    { rows: TierlistPreviewRow[]; count: number }
  >();
  if (!listIds.length) return previews;

  const [{ data: tierRows }, { data: itemRows }, { data: liveRows }] =
    await series(
      () =>
        readRows<{
          list_id: string;
          id: string;
          label: string;
          color: string;
          position: number;
        }>(
          client,
          "select list_id,id,label,color,position from public.tierlist_tiers where list_id = any($1::uuid[]) order by list_id, position",
          [listIds],
        ),
      () =>
        readRows<ItemRow & { list_id: string }>(
          client,
          "select list_id,tier_id,igdb_id,position from public.tierlist_items where list_id = any($1::uuid[])",
          [listIds],
        ),
      () =>
        // Same definer path as the board, once per list inside one query: it
        // reconciles with the owner's reach, so a private library still
        // previews on a public list and nothing leaks that the list would not.
        readRows<{ list_id: string; igdb_id: number }>(
          client,
          `select board.list_id, live.igdb_id
             from unnest($1::uuid[]) as board(list_id)
             cross join lateral public.tierlist_live_ids(target_list => board.list_id) as live(igdb_id)`,
          [listIds],
        ),
    );

  const liveByList = new Map<string, Set<number>>();
  for (const row of liveRows) {
    const set = liveByList.get(row.list_id) ?? new Set<number>();
    set.add(Number(row.igdb_id));
    liveByList.set(row.list_id, set);
  }

  const shownByList = new Map<
    string,
    { tiers: { label: string; color: string; ids: number[] }[]; count: number }
  >();
  for (const listId of listIds) {
    const inLibrary = liveByList.get(listId) ?? new Set<number>();
    const byTier = new Map<string, number[]>();
    for (const item of itemRows
      .filter((item) => item.list_id === listId && inLibrary.has(item.igdb_id))
      .sort((a, b) => a.position - b.position)) {
      const bucket = byTier.get(item.tier_id);
      if (bucket) bucket.push(item.igdb_id);
      else byTier.set(item.tier_id, [item.igdb_id]);
    }
    shownByList.set(listId, {
      count: new Set([...byTier.values()].flat()).size,
      tiers: tierRows
        .filter((tier) => tier.list_id === listId)
        .filter((tier) => (byTier.get(tier.id)?.length ?? 0) > 0)
        .slice(0, maxTiers)
        .map((tier) => ({
          label: tier.label,
          color: tier.color,
          ids: (byTier.get(tier.id) ?? []).slice(0, maxCoversPerTier),
        })),
    });
  }

  const allIds = [
    ...new Set(
      [...shownByList.values()].flatMap((shown) =>
        shown.tiers.flatMap((tier) => tier.ids),
      ),
    ),
  ];
  const games = allIds.length ? await getGamesByIds(allIds) : [];
  const byId = new Map(games.map((game) => [game.id, game]));

  for (const [listId, shown] of shownByList)
    previews.set(listId, {
      count: shown.count,
      rows: shown.tiers.map((tier) => ({
        label: tier.label,
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
      })),
    });
  return previews;
}
