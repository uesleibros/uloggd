import assert from "node:assert/strict";
import test from "node:test";
import type {
  Series,
  SeriesSlot,
  SlotHolding,
} from "../../lib/series-policy.ts";
import {
  groupBySeries,
  shelfProgress,
  slotIsIgnored,
  type ShelfRow,
} from "../../lib/series-shelf.ts";

/**
 * A library seen as the series it is made of.
 *
 * The arithmetic is trivial and the picking is not: one game of a franchise is
 * not a series somebody is working through, and a section that said otherwise
 * would be a list of every game in the library with the word "series" on it.
 */

const zelda: Series = {
  id: 1,
  name: "The Legend of Zelda",
  slug: "zelda",
  kind: "collection",
};
const mass: Series = {
  id: 2,
  name: "Mass Effect",
  slug: "mass-effect",
  kind: "collection",
};
const lonely: Series = {
  id: 3,
  name: "Journey",
  slug: "journey",
  kind: "franchise",
};

const seriesOf = new Map<number, Series>([
  [10, zelda],
  [11, zelda],
  [12, zelda],
  [20, mass],
  [21, mass],
  [30, lonely],
]);

const library: ShelfRow[] = [
  { igdb_id: 10, status: "COMPLETED" },
  { igdb_id: 11, playing: true },
  { igdb_id: 12, status: "BACKLOG" },
  { igdb_id: 20, status: "COMPLETED" },
  { igdb_id: 21, status: "COMPLETED" },
  { igdb_id: 30, status: "BACKLOG" },
  { igdb_id: 99, status: "BACKLOG" },
];

test("one game of a series is not a series", () => {
  const held = groupBySeries(library, seriesOf);
  assert.deepEqual(
    held.map((entry) => entry.series.name),
    ["The Legend of Zelda", "Mass Effect"],
  );
  // And a game in no series at all is simply not here, rather than a series
  // of its own with its own name.
  assert.ok(!held.some((entry) => entry.ids.includes(99)));
});

test("the most held comes first, and finishing breaks a tie", () => {
  const held = groupBySeries(library, seriesOf, { atLeast: 1 });
  assert.equal(held[0].series.name, "The Legend of Zelda");
  assert.equal(held[0].ids.length, 3);
  assert.equal(held[0].finished, 1);
  assert.equal(held[0].playing, 1);
  assert.equal(held[1].finished, 2);
  // Journey has one game, so it is last of the three and only here because
  // this call asked for everything.
  assert.equal(held[2].series.name, "Journey");
});

test("the same game twice is one game", () => {
  const held = groupBySeries(
    [
      { igdb_id: 10, status: "COMPLETED" },
      { igdb_id: 10, status: "COMPLETED" },
      { igdb_id: 11, status: "BACKLOG" },
    ],
    seriesOf,
  );
  assert.equal(held[0].ids.length, 2);
  assert.equal(held[0].finished, 1);
});

test("how many series are asked about is the caller's to say", () => {
  assert.equal(groupBySeries(library, seriesOf, { howMany: 1 }).length, 1);
});

test("progress counts played, finished, and what comes next", () => {
  const slots: SeriesSlot[] = [
    { game: { id: 10 }, satisfiedBy: [10] },
    { game: { id: 11 }, satisfiedBy: [11] },
    // The third is only in the library as its remake.
    { game: { id: 12 }, satisfiedBy: [12, 120] },
    { game: { id: 13 }, satisfiedBy: [13] },
    { game: { id: 14 }, satisfiedBy: [14] },
  ];
  const holdings = new Map<number, SlotHolding>([
    [10, { igdb_id: 10, status: "COMPLETED" }],
    [11, { igdb_id: 11, playing: true }],
    [120, { igdb_id: 120, status: "COMPLETED" }],
  ]);
  const progress = shelfProgress(slots, holdings);
  assert.equal(progress.total, 5);
  // Three of five: the remake counts for the game it remakes, which is the
  // whole reason the slots carry substitutes.
  assert.equal(progress.played, 3);
  assert.equal(progress.finished, 2);
  // And the next one is the first that is nowhere in the library, in release
  // order, not the last one or the highest numbered.
  assert.equal(progress.next?.game.id, 13);
});

test("an ignored entry leaves the count, not the row", () => {
  const slots: SeriesSlot[] = [
    { game: { id: 1 }, satisfiedBy: [1] },
    // A broadcast that no longer exists, and a phone game whose servers shut.
    { game: { id: 2 }, satisfiedBy: [2] },
    { game: { id: 3 }, satisfiedBy: [3] },
    { game: { id: 4 }, satisfiedBy: [4] },
  ];
  const holdings = new Map<number, SlotHolding>([
    [1, { igdb_id: 1, status: "COMPLETED" }],
  ]);
  const ignored = new Set([2, 3]);
  const progress = shelfProgress(slots, holdings, ignored);
  // One of two, not one of four: the two nobody can reach stop being a debt.
  assert.equal(progress.total, 2);
  assert.equal(progress.played, 1);
  assert.equal(progress.finished, 1);
  assert.equal(progress.ignored, 2);
  // And what comes next skips them rather than pointing at one.
  assert.equal(progress.next?.game.id, 4);
  // The slot itself is still there to draw: the gap is part of the series.
  assert.equal(slots.length, 4);
  assert.equal(slotIsIgnored(slots[1], ignored), true);
  assert.equal(slotIsIgnored(slots[0], ignored), false);
});

test("ignoring a remake is not ignoring the game it remakes", () => {
  const slot: SeriesSlot = { game: { id: 1 }, satisfiedBy: [1, 100] };
  // The substitute is set aside; the entry it stands in for is not.
  assert.equal(slotIsIgnored(slot, new Set([100])), false);
  assert.equal(slotIsIgnored(slot, new Set([1])), true);
});

test("a series set aside entirely counts nothing", () => {
  const slots: SeriesSlot[] = [
    { game: { id: 1 }, satisfiedBy: [1] },
    { game: { id: 2 }, satisfiedBy: [2] },
  ];
  const progress = shelfProgress(slots, new Map(), new Set([1, 2]));
  assert.equal(progress.total, 0);
  assert.equal(progress.ignored, 2);
  assert.equal(progress.next, null);
});

test("a series with nothing in it has no next after the end", () => {
  const slots: SeriesSlot[] = [{ game: { id: 1 }, satisfiedBy: [1] }];
  const holdings = new Map<number, SlotHolding>([
    [1, { igdb_id: 1, status: "COMPLETED" }],
  ]);
  assert.deepEqual(shelfProgress(slots, holdings), {
    total: 1,
    played: 1,
    finished: 1,
    ignored: 0,
    next: null,
  });
});
