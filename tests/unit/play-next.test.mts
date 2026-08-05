import assert from "node:assert/strict";
import test from "node:test";
import { weeksSince } from "../../lib/play-next-idle";

/**
 * The shelf that asks a library what it is for.
 *
 * Built from what the data said rather than from what a bigger site does. The
 * first idea was to show what people you follow thought of a game, which is
 * the best feature on sites like this one and would render for nobody here:
 * fifty-nine follow edges in total, half the accounts following no one, and
 * five ratings on the most-rated game. Seventeen of the nineteen libraries have
 * something in progress or queued, which is why this shelf was worth building
 * and that one was not.
 *
 * Only the arithmetic is exercised here; the query is a filter and an order,
 * and the shelf is markup.
 */

test("nothing is called idle before two weeks", () => {
  // A game touched last Tuesday needs no comment. A shelf that labels every
  // card says nothing, and the label is the only thing this shelf adds.
  const now = Date.UTC(2026, 7, 5);
  const daysAgo = (days: number) =>
    new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(weeksSince(daysAgo(0), now), null);
  assert.equal(weeksSince(daysAgo(6), now), null);
  assert.equal(weeksSince(daysAgo(13), now), null, "13 days is not two weeks");
  assert.equal(weeksSince(daysAgo(14), now), 2, "14 days is exactly two");
  assert.equal(weeksSince(daysAgo(20), now), 2, "weeks are whole, not rounded");
  assert.equal(weeksSince(daysAgo(21), now), 3);
  assert.equal(weeksSince(daysAgo(365), now), 52);
});

test("a bad or future timestamp reads as recent, not as negative weeks", () => {
  // `updated_at` comes from the database clock and this runs wherever the page
  // renders, so a few seconds of skew is ordinary and must not print
  // "untouched for -1 weeks". It falls out of the comparison rather than
  // needing its own guard, which is worth stating: the guard that was here
  // first was dead code, and this test passed with it deleted.
  const now = Date.UTC(2026, 7, 5);
  assert.equal(weeksSince(new Date(now + 60_000).toISOString(), now), null);
  assert.equal(weeksSince(new Date(now + 86_400_000).toISOString(), now), null);
  assert.equal(weeksSince("not a date", now), null);
  assert.equal(weeksSince("", now), null);
});

test("the queue is ordered oldest first, and the module says why", async () => {
  // The rule worth pinning is a decision, not a calculation: a queue sorted by
  // recency shows what was added last, which somebody already knows about.
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("lib/play-next.ts", "utf8");
  // The last mention, not the first: `queued` names a field on the type as
  // well, and anchoring on that read the declaration instead of the code.
  const queued = source.slice(source.lastIndexOf("queued:"));
  assert.match(
    queued.slice(0, 400),
    /a\.updatedAt\.localeCompare\(b\.updatedAt\)/,
    "the backlog shelf no longer surfaces the games that have been sitting longest",
  );
  // And the in-progress shelf keeps the opposite order, straight from the
  // query, so the thing touched most recently is the first one offered.
  assert.match(
    source,
    /ascending: false/,
    "the query stopped ordering by recency, which the continue shelf relies on",
  );
});
