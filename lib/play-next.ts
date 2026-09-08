import "server-only";
import { serverApi } from "@/lib/api-server";
import type { Game } from "@/lib/igdb";

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

export async function getPlayNext(): Promise<PlayNext> {
  return (await serverApi.get<{ data: PlayNext }>("/discovery/library")).data;
}
