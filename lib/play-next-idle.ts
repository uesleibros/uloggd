/**
 * How long a game has sat untouched, for the shelf that says so.
 *
 * Its own module, free of `server-only`, because this is the one decision in
 * the feature worth a test and a test cannot import anything the bundler
 * reserves for the server. Same split as the Steam summary parsing: the query
 * is a filter and an order, this is the rule.
 */

/** Two weeks. Under it, a game does not need a comment. */
const IDLE_WEEKS = 2;

/**
 * Whole weeks since something moved, or null when it is recent enough to say
 * nothing about.
 *
 * Whole, never rounded: "untouched for 3 weeks" on something touched sixteen
 * days ago would be a small lie in the one place the shelf is asking to be
 * believed.
 *
 * A timestamp in the future, or one that is not a date at all, reads as
 * recent. That falls out of the comparison rather than needing a guard: a
 * negative span floors to a negative number and an unparseable one to NaN,
 * and neither is at least two. The guard that used to sit here was dead code,
 * which the test that was meant to cover it proved by passing without it.
 *
 * It matters because `updated_at` comes from the database clock while this
 * runs wherever the page renders, so a little skew between them is ordinary.
 */
export function weeksSince(updatedAt: string, now = Date.now()): number | null {
  const weeks = Math.floor(
    (now - new Date(updatedAt).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return weeks >= IDLE_WEEKS ? weeks : null;
}
