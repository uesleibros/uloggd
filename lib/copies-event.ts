import type { Copy } from "@/lib/library-copies";

/**
 * One event for "the copies of this game changed".
 *
 * The copies card sits in the game's rail and the run editor sits on the
 * journey page, and both can make one. Neither is inside the other, so they
 * meet on `window`, the way XP feedback and the playlog bar already do.
 */
export const COPIES_CHANGED_EVENT = "uloggd:copies-changed";

export type CopiesChanged = { gameId: number; copies: Copy[] };

export function announceCopies(gameId: number, copies: Copy[]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CopiesChanged>(COPIES_CHANGED_EVENT, {
      detail: { gameId, copies },
    }),
  );
}
