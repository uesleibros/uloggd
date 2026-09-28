import assert from "node:assert/strict";
import test from "node:test";
import {
  readTaste,
  tasteIsWorthDrawing,
  type TasteGame,
  type TasteRow,
} from "../../lib/stats-taste.ts";

/**
 * Counting a shelf by what the catalogue says it is.
 *
 * The arithmetic is easy and the judgements are not, so these are about the
 * judgements: a game in two genres, a game the catalogue does not know, and
 * the difference between a studio behind nine games and a studio behind the
 * one game somebody never stopped playing.
 */

const shelf: TasteGame[] = [
  {
    id: 1,
    genres: ["RPG", "Adventure"],
    developers: ["Atlus"],
    publishers: ["Sega"],
  },
  { id: 2, genres: ["RPG"], developers: ["Atlus"], publishers: ["Sega"] },
  {
    id: 3,
    genres: ["Shooter"],
    developers: ["id Software"],
    publishers: ["Bethesda"],
  },
  {
    id: 4,
    genres: ["Adventure"],
    developers: ["Nintendo"],
    publishers: ["Nintendo"],
  },
];
const rows: TasteRow[] = [
  { igdb_id: 1, minutes: 600, in_library: true },
  { igdb_id: 2, minutes: 60, in_library: true },
  { igdb_id: 3, minutes: 30, in_library: true },
  { igdb_id: 4, minutes: 0, in_library: true },
];

test("a game in two genres counts in both", () => {
  const reading = readTaste(rows, shelf);
  const genres = new Map(reading.genres.map((row) => [row.name, row.games]));
  assert.equal(genres.get("RPG"), 2);
  assert.equal(genres.get("Adventure"), 2);
  assert.equal(genres.get("Shooter"), 1);
  // Five genre placements over four games: the shares are out of the games,
  // and they add up to more than all of them. That is the honest shape of the
  // question, and the reason the page does not draw a pie.
  const placements = reading.genres.reduce((sum, row) => sum + row.games, 0);
  assert.equal(placements, 5);
  assert.equal(reading.games, 4);
});

test("the same genre twice on one game is one game", () => {
  const reading = readTaste(
    [{ igdb_id: 9, minutes: 10, in_library: true }],
    [{ id: 9, genres: ["RPG", "RPG", " RPG "] }],
  );
  assert.deepEqual(reading.genres, [
    { name: "RPG", games: 1, minutes: 10, slug: null },
  ]);
});

test("games and minutes are two different answers", () => {
  const reading = readTaste(rows, shelf);
  const atlus = reading.developers.find((row) => row.name === "Atlus")!;
  const nintendo = reading.developers.find((row) => row.name === "Nintendo")!;
  assert.equal(atlus.games, 2);
  assert.equal(atlus.minutes, 660);
  // A game in the library and never played is a game, and no minutes. The
  // page says which of the two it is showing for exactly this reason.
  assert.equal(nintendo.games, 1);
  assert.equal(nintendo.minutes, 0);
});

test("an id the catalogue never answered is counted, not invented", () => {
  const reading = readTaste(
    [...rows, { igdb_id: 404, minutes: 900, in_library: true }],
    shelf,
  );
  assert.equal(reading.unknown, 1);
  assert.equal(reading.games, 4);
  // And its minutes are not in the totals: a genre it might have had is not
  // a genre it did have.
  assert.equal(reading.minutes, 690);
  assert.ok(!reading.genres.some((row) => row.name === "unknown"));
});

test("a studio carries the address behind its name", () => {
  const reading = readTaste(
    [
      { igdb_id: 1, minutes: 10, in_library: true },
      { igdb_id: 2, minutes: 10, in_library: true },
    ],
    [
      {
        id: 1,
        developers: ["Atlus"],
        companies: [{ name: "Atlus", slug: "atlus" }],
      },
      // The same studio, on a game whose credits came back without a slug:
      // the one that has it wins, and nothing is guessed from the name.
      { id: 2, developers: ["Atlus"], companies: [] },
    ],
  );
  assert.equal(reading.developers[0].name, "Atlus");
  assert.equal(reading.developers[0].games, 2);
  assert.equal(reading.developers[0].slug, "atlus");

  // And a studio the catalogue named without a slug stays a word.
  const wordOnly = readTaste(
    [{ igdb_id: 3, minutes: 5, in_library: true }],
    [{ id: 3, publishers: ["Sem página"], companies: [] }],
  );
  assert.equal(wordOnly.publishers[0].slug, null);
});

test("the order is games, then minutes, then the name", () => {
  const reading = readTaste(
    [
      { igdb_id: 1, minutes: 10, in_library: true },
      { igdb_id: 2, minutes: 900, in_library: true },
      { igdb_id: 3, minutes: 5, in_library: true },
    ],
    [
      { id: 1, genres: ["Zed"] },
      { id: 2, genres: ["Alpha"] },
      { id: 3, genres: ["Alpha"] },
    ],
  );
  assert.deepEqual(
    reading.genres.map((row) => row.name),
    ["Alpha", "Zed"],
  );
});

test("a shelf too small to mean anything is not drawn", () => {
  assert.equal(tasteIsWorthDrawing(readTaste(rows, shelf)), false);
  const bigger = readTaste(
    Array.from({ length: 6 }, (_, index) => ({
      igdb_id: index + 1,
      minutes: 10,
      in_library: true,
    })),
    Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      genres: ["RPG"],
    })),
  );
  assert.equal(tasteIsWorthDrawing(bigger), true);
});

test("how many are kept is the caller's to say", () => {
  const reading = readTaste(rows, shelf, 2);
  assert.equal(reading.genres.length, 2);
  assert.equal(reading.developers.length, 2);
});
