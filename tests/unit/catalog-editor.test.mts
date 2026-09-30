import assert from "node:assert/strict";
import test from "node:test";
import { catalogSearchResults } from "../../lib/catalog-search-result.ts";
import { sortTierlistGames } from "../../lib/tierlist-sort.ts";

const result = {
  id: 123,
  name: "A game",
  slug: "a-game",
  coverUrl: "/custom.jpg",
  fallbackCoverUrl: "/original.jpg",
  releaseTimestamp: 1_700_000_000,
};

test("catalogue additions preserve release metadata and the original cover", () => {
  assert.deepEqual(catalogSearchResults({ results: [result] }), [
    {
      igdbId: result.id,
      name: result.name,
      slug: result.slug,
      coverUrl: result.coverUrl,
      fallbackUrl: result.fallbackCoverUrl,
      releaseTimestamp: result.releaseTimestamp,
    },
  ]);
});

test("a release at the Unix epoch remains a known release", () => {
  const [game] = catalogSearchResults({
    results: [{ ...result, releaseTimestamp: 0 }],
  });
  assert.equal(game.releaseTimestamp, 0);
});

test("unavailable dates stay unknown and older responses retain their cover fallback", () => {
  const [game] = catalogSearchResults({
    results: [
      { ...result, releaseTimestamp: null, fallbackCoverUrl: undefined },
    ],
  });
  assert.equal(game.releaseTimestamp, null);
  assert.equal(game.fallbackUrl, result.coverUrl);
});

test("invalid catalogue envelopes are failures rather than empty results", () => {
  for (const payload of [null, {}, { error: "unavailable" }, { results: {} }]) {
    assert.throws(() => catalogSearchResults(payload));
  }
  assert.deepEqual(catalogSearchResults({ results: [] }), []);
});

test("invalid catalogue rows cannot become list items", () => {
  const invalid = [
    null,
    12,
    {},
    { ...result, id: -1 },
    { ...result, id: 1.5 },
    { ...result, slug: " " },
  ];
  assert.deepEqual(catalogSearchResults({ results: invalid }), []);
});

const games = catalogSearchResults({
  results: [
    { ...result, id: 1, name: "Unknown", releaseTimestamp: null },
    { ...result, id: 2, name: "Recent", releaseTimestamp: 100 },
    { ...result, id: 3, name: "Older", releaseTimestamp: -100 },
    { ...result, id: 4, name: "Epoch", releaseTimestamp: 0 },
  ],
});

test("both release sorts put unknown dates last, including dates before 1970", () => {
  assert.deepEqual(
    sortTierlistGames(games, "newest").map((game) => game.igdbId),
    [2, 4, 3, 1],
  );
  assert.deepEqual(
    sortTierlistGames(games, "oldest").map((game) => game.igdbId),
    [3, 4, 2, 1],
  );
  assert.deepEqual(
    games.map((game) => game.igdbId),
    [1, 2, 3, 4],
  );
});

test("manual sorting preserves placement and alphabetic sorting uses the interface locale", () => {
  assert.deepEqual(sortTierlistGames(games, "manual"), games);
  const names = sortTierlistGames(games, "az", "pt-BR").map(
    (game) => game.name,
  );
  assert.deepEqual(names, ["Epoch", "Older", "Recent", "Unknown"]);
  assert.deepEqual(
    sortTierlistGames(games, "za", "pt-BR").map((game) => game.name),
    [...names].reverse(),
  );
});
