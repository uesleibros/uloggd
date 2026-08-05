import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGamesByIds, type Game } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";

// Re-exported so the shelf has one import, while the rule itself stays in a
// module a test can reach.
export { weeksSince } from "@/lib/play-next-idle";

/**
 * What this account left unfinished, and what it lined up next.
 *
 * Built after looking at what people here actually do. Nineteen libraries, a
 * median of thirty-six games each, and fifteen hundred of those marked
 * finished: the catalogue habit is real. What almost nobody does is anything
 * downstream of it. Four accounts keep a diary, half follow nobody.
 *
 * So this asks the one question a library of thirty-six games raises and
 * cannot answer today: what was I playing? Seventeen of the nineteen have
 * something in progress or queued, which is why it is worth a shelf rather
 * than a setting nobody finds.
 *
 * Two rows, and the first one matters more. A game marked as playing and not
 * touched for weeks is not a plan, it is something forgotten, and the library
 * is the only place that knows.
 */

/** Only the two this shelf asks for; the column allows more. */
export type PlayNextStatus = "PLAYING" | "BACKLOG";

export type PlayNextEntry = {
  game: Game;
  /**
   * Shaped for `QuickGameCard`, which is what draws it. The booleans are not
   * nullable there and are not nullable in practice either, so they are
   * settled here rather than left for the card to guess at.
   */
  state: {
    status: PlayNextStatus;
    playing: boolean;
    backlog: boolean;
    wishlist: boolean;
    liked: boolean;
    quick_rating: number | null;
    custom_cover_url: string | null;
  };
  /** When the shelf last saw movement, for "you left this a month ago". */
  updatedAt: string;
};

export type PlayNext = {
  /** Marked as playing: unfinished, and the reason this exists. */
  continuing: PlayNextEntry[];
  /** Queued but not started. */
  queued: PlayNextEntry[];
};

const SHELF_LIMIT = 12;

type Row = {
  igdb_id: number;
  status: PlayNextStatus;
  playing: boolean | null;
  backlog: boolean | null;
  wishlist: boolean | null;
  liked: boolean | null;
  quick_rating: number | null;
  custom_cover_url: string | null;
  updated_at: string;
};

export async function getPlayNext(
  supabase: SupabaseClient,
  profileId: string,
): Promise<PlayNext> {
  // One read for both rows. Two queries would be two round trips for a shelf
  // that is decoration on a page already waiting on several.
  const { data } = await supabase
    .from("user_games")
    .select(
      "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url,updated_at",
    )
    .eq("profile_id", profileId)
    .in("status", ["PLAYING", "BACKLOG"])
    .order("updated_at", { ascending: false })
    .limit(SHELF_LIMIT * 2);

  const rows = (data ?? []) as Row[];
  if (!rows.length) return { continuing: [], queued: [] };

  const games = await getGamesByIds(rows.map((row) => row.igdb_id));
  const byId = new Map(games.map((game) => [game.id, game]));

  const entries = rows.flatMap((row): PlayNextEntry[] => {
    const game = byId.get(row.igdb_id);
    // A row whose game IGDB no longer knows: the library keeps it, but there
    // is no cover and no name to draw, so the shelf skips it rather than
    // showing a blank card.
    if (!game) return [];
    return [
      {
        game: {
          ...game,
          coverUrl: resolveGameCover(game.coverUrl, row.custom_cover_url),
        },
        state: {
          status: row.status,
          playing: Boolean(row.playing),
          backlog: Boolean(row.backlog),
          wishlist: Boolean(row.wishlist),
          liked: Boolean(row.liked),
          quick_rating: row.quick_rating,
          custom_cover_url: row.custom_cover_url,
        },
        updatedAt: row.updated_at,
      },
    ];
  });

  return {
    continuing: entries
      .filter((entry) => entry.state.status === "PLAYING")
      .slice(0, SHELF_LIMIT),
    // Oldest first, deliberately. A queue sorted by recency shows what was
    // added last, which somebody already knows about; the useful end is the
    // one that has been sitting there.
    queued: entries
      .filter((entry) => entry.state.status === "BACKLOG")
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .slice(0, SHELF_LIMIT),
  };
}
