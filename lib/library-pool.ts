import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds, type Game } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";

/**
 * A game from someone's library, resolved enough to draw.
 *
 * `fallbackUrl` is the original cover, kept because `resolveGameCover` can
 * return a replacement that turns out to be missing and the caller needs
 * something to fall back to.
 */
export type LibraryGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string;
  fallbackUrl: string;
  releaseTimestamp: number | null;
};

/**
 * The owner's library, minus games already used, sorted by name.
 *
 * Modelled on the tierlist's pool, which was the only place that offered one.
 * The tierlist still builds its own rather than calling this: it resolves the
 * tiered games and the pool through a single `getGamesByIds`, and splitting
 * them would turn one catalogue batch into two for no gain. This is the entry
 * point for everything else that needs the same list.
 *
 * Reads `user_games` with the caller's own privileges, so it only ever returns
 * a library the caller is allowed to read. In practice that means the owner's
 * own: a private library stays private, and a viewer who cannot see it gets
 * nothing rather than an error.
 */
export async function getLibraryPool(
  supabase: SupabaseClient,
  ownerId: string,
  exclude: Iterable<number> = [],
): Promise<LibraryGame[]> {
  const { data } = await supabase
    .from("user_games")
    .select("igdb_id")
    .eq("profile_id", ownerId);

  const used = new Set(exclude);
  const ids = [
    ...new Set(
      ((data ?? []) as { igdb_id: number }[])
        .map((row) => row.igdb_id)
        .filter((id) => !used.has(id)),
    ),
  ];
  if (!ids.length) return [];

  const games = await getGamesByIds(ids);
  return games
    .flatMap((game: Game): LibraryGame[] =>
      game
        ? [
            {
              igdbId: game.id,
              slug: game.slug,
              name: game.name,
              coverUrl: resolveGameCover(game.coverUrl, null),
              fallbackUrl: game.coverUrl,
              releaseTimestamp: game.releaseTimestamp,
            },
          ]
        : [],
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}
