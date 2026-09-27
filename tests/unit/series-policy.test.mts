import assert from "node:assert/strict";
import test from "node:test";
import {
  pickSeries,
  seriesSlots,
  slotProgress,
  type SlotHolding,
} from "../../lib/series-policy";

/**
 * Which of IGDB's several answers counts as "the series", and what counts as
 * having played one of its games.
 *
 * Both are policies rather than facts, which is why they are tested. Picking
 * the series wrong turns "four of nine" into "one of one". Counting it wrong
 * is worse in one direction than the other: a missing equivalence
 * under-reports somebody, and a wrong one tells them they have played
 * something they have not.
 */

test("the outer collection wins, because the inner one is the game", () => {
  const series = pickSeries(
    [
      { id: 8988, name: "The Legend of Zelda: Breath of the Wild" },
      { id: 106, name: "The Legend of Zelda" },
    ],
    [{ id: 596, name: "The Legend of Zelda" }],
  );
  assert.deepEqual(series, {
    id: 106,
    name: "The Legend of Zelda",
    slug: null,
    kind: "collection",
  });
});

test("a franchise is the fallback, never the preference", () => {
  assert.equal(
    pickSeries([{ id: 1, name: "Yakuza" }], [{ id: 2, name: "Sega" }])?.kind,
    "collection",
  );
  const only = pickSeries(
    [],
    [{ id: 2, name: "Star Wars", slug: "star-wars" }],
  );
  assert.deepEqual(only, {
    id: 2,
    name: "Star Wars",
    slug: "star-wars",
    kind: "franchise",
  });
});

test("a game in nothing has no series", () => {
  assert.equal(pickSeries(undefined, undefined), null);
  assert.equal(pickSeries([], []), null);
  assert.equal(pickSeries([{ id: 3, name: "" }], []), null);
});

/**
 * One series, drawn small: three games, and around the first one every kind
 * of relation IGDB can state.
 *
 *   1  Resident Evil          remake 11, remaster 12, port 13, edition 14
 *   2  Resident Evil 2        a sequel, so a slot of its own
 *   3  Resident Evil Survivor a spinoff with no stated relation
 *   20 Separate Ways          content for 2, so not a slot
 */
const ROWS = [
  {
    id: 1,
    remakes: [{ id: 11 }],
    remasters: [{ id: 12 }],
    ports: [{ id: 13 }],
  },
  { id: 2 },
  { id: 3 },
  { id: 11, remakes: [] },
  { id: 14, version_parent: { id: 1 } },
  { id: 20, parent_game: { id: 2 } },
];

test("a variant folds into the game it is a variant of", () => {
  const slots = seriesSlots(ROWS);
  assert.deepEqual(
    slots.map((slot) => slot.game.id),
    [1, 2, 3],
    "the remake, the edition and the DLC are not slots of their own",
  );
  assert.deepEqual(slots[0].satisfiedBy, [1, 11, 12, 13, 14]);
  assert.deepEqual(slots[1].satisfiedBy, [2], "a sequel stands alone");
  assert.deepEqual(slots[2].satisfiedBy, [3], "a spinoff has no substitutes");
});

test("a remake, a remaster, a port and an edition all answer for the base", () => {
  const slots = seriesSlots(ROWS);
  for (const played of [11, 12, 13, 14]) {
    const holdings = new Map<number, SlotHolding>([
      [played, { igdb_id: played, status: "COMPLETED" }],
    ]);
    assert.deepEqual(
      slotProgress(slots[0], holdings),
      { state: "finished", via: played },
      `playing ${played} should finish the first slot`,
    );
  }
});

test("content and a spinoff answer for nothing", () => {
  const slots = seriesSlots(ROWS);
  // The DLC of the second game.
  const dlc = new Map<number, SlotHolding>([
    [20, { igdb_id: 20, status: "COMPLETED" }],
  ]);
  assert.equal(slotProgress(slots[1], dlc).state, "none");
  // And the spinoff is not the sequel, whatever the shelf says.
  const spinoff = new Map<number, SlotHolding>([
    [3, { igdb_id: 3, status: "COMPLETED" }],
  ]);
  assert.equal(slotProgress(slots[1], spinoff).state, "none");
  assert.equal(slotProgress(slots[2], spinoff).state, "finished");
});

test("the furthest along wins, and the game itself wins a tie", () => {
  const slots = seriesSlots(ROWS);
  // Two substitutes, one finished and one merely owned.
  const mixed = new Map<number, SlotHolding>([
    [11, { igdb_id: 11, status: "BACKLOG" }],
    [12, { igdb_id: 12, status: "COMPLETED" }],
  ]);
  assert.deepEqual(slotProgress(slots[0], mixed), {
    state: "finished",
    via: 12,
  });

  // The original and a remake, both finished: the slot's own game answers,
  // and `via` stays null because there is nothing to explain.
  const both = new Map<number, SlotHolding>([
    [1, { igdb_id: 1, status: "COMPLETED" }],
    [11, { igdb_id: 11, status: "COMPLETED" }],
  ]);
  assert.deepEqual(slotProgress(slots[0], both), {
    state: "finished",
    via: null,
  });
});

test("playing and owning are their own answers", () => {
  const slots = seriesSlots(ROWS);
  assert.deepEqual(
    slotProgress(
      slots[0],
      new Map([[11, { igdb_id: 11, playing: true, status: "BACKLOG" }]]),
    ),
    { state: "playing", via: 11 },
  );
  assert.deepEqual(
    slotProgress(slots[0], new Map([[1, { igdb_id: 1, status: "BACKLOG" }]])),
    { state: "library", via: null },
  );
  assert.equal(slotProgress(slots[0], new Map()).state, "none");
});

test("a game with no relations at all is simply itself", () => {
  const [slot] = seriesSlots([{ id: 99 }]);
  assert.deepEqual(slot.satisfiedBy, [99]);
  assert.equal(slotProgress(slot, new Map()).state, "none");
});
