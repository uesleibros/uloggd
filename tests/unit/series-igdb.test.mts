import assert from "node:assert/strict";
import test from "node:test";
import {
  seriesRowsFromIgdb,
  seriesSlots,
  slotProgress,
  type SlotHolding,
} from "../../lib/series-policy";

/**
 * The seam between IGDB's answers and the series policy.
 *
 * The policy tests use rows written by hand, which prove the rules and prove
 * nothing about the adapter: a wrong field name, or reading a relation in the
 * direction IGDB does not record it, costs somebody a slot and every one of
 * those tests still passes.
 *
 * So these are the shapes IGDB actually returns, copied from real answers for
 * the Arkham collection and trimmed to the fields the reader asks for. No
 * request is made: the two queries the adapter runs are represented by the
 * two arrays below.
 */

/** Query one: the collection's main games, with the relations they carry. */
const COLLECTION = [
  {
    id: 500,
    name: "Batman: Arkham Asylum",
    remasters: [{ id: 13_020 }],
    ports: [{ id: 133_505 }, { id: 133_506 }],
  },
  {
    id: 502,
    name: "Batman: Arkham City",
    remasters: [{ id: 13_021 }],
  },
  { id: 2003, name: "Batman: Arkham Origins", ports: [{ id: 133_507 }] },
  { id: 5_503, name: "Batman: Arkham Knight" },
];

/**
 * Query two: rows whose `version_parent` is one of those.
 *
 * The Game of the Year Edition is `game_type: 3`, a bundle, which is why a
 * listing of the collection filtered to main games never contains it however
 * it is asked for. That is the whole reason this second read exists.
 */
const EDITIONS = [
  { id: 27_862, version_parent: { id: 500 } },
  { id: 43_018, version_parent: { id: 500 } },
  { id: 43_020, version_parent: { id: 2003 } },
];

const rows = seriesRowsFromIgdb(COLLECTION, EDITIONS);
const slots = seriesSlots(rows);
const finished = (id: number): Map<number, SlotHolding> =>
  new Map([[id, { igdb_id: id, status: "COMPLETED" }]]);

test("the series is the games, once each", () => {
  assert.deepEqual(
    slots.map((slot) => slot.game.id),
    [500, 502, 2003, 5_503],
  );
});

test("a remaster, a port and an edition all answer for the base", () => {
  const asylum = slots[0];
  assert.deepEqual(
    asylum.satisfiedBy,
    [500, 13_020, 133_505, 133_506, 27_862, 43_018],
  );
  for (const played of [13_020, 133_505, 27_862, 43_018]) {
    assert.deepEqual(
      slotProgress(asylum, finished(played)),
      { state: "finished", via: played },
      `${played} should answer for Arkham Asylum`,
    );
  }
});

test("the base game answers for itself, without an explanation", () => {
  assert.deepEqual(slotProgress(slots[0], finished(500)), {
    state: "finished",
    via: null,
  });
});

test("a sequel is never a substitute", () => {
  // Arkham City is its own slot and nothing about it satisfies Asylum.
  assert.deepEqual(slots[1].satisfiedBy, [502, 13_021]);
  assert.equal(slotProgress(slots[0], finished(502)).state, "none");
  assert.equal(slotProgress(slots[3], finished(502)).state, "none");
});

test("content and unrelated games answer for nothing", () => {
  // A DLC carries `parent_game`, never a version or a remake relation, so it
  // never reaches a slot.
  const withDlc = seriesRowsFromIgdb(
    [
      ...COLLECTION,
      { id: 9_001, name: "Harley Quinn's Revenge", parent_game: { id: 502 } },
    ],
    EDITIONS,
  );
  const withDlcSlots = seriesSlots(withDlc);
  assert.deepEqual(
    withDlcSlots.map((slot) => slot.game.id),
    [500, 502, 2003, 5_503],
    "content for a game in the list is not a slot beside it",
  );
  assert.equal(
    slotProgress(withDlcSlots[1], finished(9_001)).state,
    "none",
    "playing the expansion is not playing the game",
  );
  assert.equal(slotProgress(slots[0], finished(123_456)).state, "none");
});

test("a port that is also listed in the collection keeps one slot", () => {
  // IGDB files some ports as main games, so they appear in both answers.
  const withPort = seriesSlots(
    seriesRowsFromIgdb(
      [...COLLECTION, { id: 133_505, name: "Arkham Asylum (Mac)" }],
      EDITIONS,
    ),
  );
  assert.deepEqual(
    withPort.map((slot) => slot.game.id),
    [500, 502, 2003, 5_503],
    "the port folds into the game it is a port of",
  );
});

test("a game with no relations, and an answer with none at all", () => {
  const bare = seriesSlots(seriesRowsFromIgdb([{ id: 77, name: "Alone" }], []));
  assert.deepEqual(bare[0].satisfiedBy, [77]);
  assert.deepEqual(seriesRowsFromIgdb([], []), []);
  // An edition whose parent is not in the collection is simply not used.
  const orphan = seriesRowsFromIgdb(COLLECTION, [
    { id: 4_242, version_parent: { id: 999_999 } },
  ]);
  assert.equal(orphan[0].versions, undefined);
});
