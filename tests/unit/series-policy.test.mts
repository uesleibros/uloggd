import assert from "node:assert/strict";
import test from "node:test";
import { pickSeries } from "../../lib/series-policy";

/**
 * Which of IGDB's several answers counts as "the series".
 *
 * This is a policy rather than a fact, which is why it is tested: a game is
 * in any number of collections and franchises, IGDB nests them, and picking
 * wrong turns "four of nine" into "one of one" or into a shelf called Star
 * Wars that nobody is playing their way through.
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
  // Both present: the collection is the one people go through.
  assert.equal(
    pickSeries([{ id: 1, name: "Yakuza" }], [{ id: 2, name: "Sega" }])?.kind,
    "collection",
  );
  // Only a franchise: better than nothing, which is what a game with no
  // collection would otherwise get.
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
  // A row with no name is not a series either: it would draw a heading with
  // nothing in it.
  assert.equal(pickSeries([{ id: 3, name: "" }], []), null);
});
