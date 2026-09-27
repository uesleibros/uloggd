import assert from "node:assert/strict";
import test from "node:test";
import {
  copyCursorClause,
  copyOrderBy,
  copySearchTerm,
  copySortKey,
  decodeCopyCursor,
  encodeCopyCursor,
  multipleCopyTotals,
  COPY_SORTS,
} from "../../lib/copy-browsing";

/**
 * Paging a shelf, and the two counts that look like one.
 *
 * A cursor that is not stable duplicates or drops rows, which somebody finds
 * on their fourth page and never reports precisely. So the order and the
 * boundary are written per sort and checked against each other here.
 */

test("a cursor survives a round trip and refuses nonsense", () => {
  const cursor = {
    key: "2026-09-27T05:00:00.000Z",
    id: "0b8f1f3e-9c1a-4f61-9a3f-11d2b5c6a7e8",
  };
  assert.deepEqual(decodeCopyCursor(encodeCopyCursor(cursor)), cursor);
  assert.deepEqual(
    decodeCopyCursor(encodeCopyCursor({ key: null, id: cursor.id })),
    { key: null, id: cursor.id },
  );
  // Anything else reads as "start from the beginning" rather than throwing at
  // somebody who edited a URL.
  for (const nonsense of [
    "",
    "abc",
    "e30",
    Buffer.from('["a","b"]').toString("base64url"),
  ])
    assert.equal(decodeCopyCursor(nonsense), null, `${nonsense} decoded`);
  assert.equal(decodeCopyCursor(null), null);
});

test("every sort ends in the id", () => {
  // An order without a tie-break is not an order: rows sharing a key come
  // back however the plan happens to produce them, which changes per page.
  for (const sort of COPY_SORTS)
    assert.match(copyOrderBy(sort), /\bid (asc|desc)$/, sort);
});

test("the boundary matches the order it pages", () => {
  // Descending orders take rows before the cursor, ascending ones after.
  assert.match(copyOrderBy("newest"), /created_at desc/);
  assert.match(copyCursorClause("newest", "$1", "$2"), /\) < \(/);
  assert.match(copyOrderBy("oldest"), /created_at asc/);
  assert.match(copyCursorClause("oldest", "$1", "$2"), /\) > \(/);
  assert.match(copyOrderBy("title"), /game_slug asc/);
  assert.match(copyCursorClause("title", "$1", "$2"), /game_slug/);
  // Undated copies come last, and the boundary knows it.
  assert.match(copyOrderBy("acquired"), /nulls last/);
  assert.match(copyCursorClause("acquired", "$1", "$2"), /acquired_on is null/);
});

test("the cursor carries the column the sort reads", () => {
  assert.equal(copySortKey("newest"), "created_at");
  assert.equal(copySortKey("oldest"), "created_at");
  assert.equal(copySortKey("title"), "game_slug");
  assert.equal(copySortKey("acquired"), "acquired_on");
});

test("more than one copy is not more than one platform", () => {
  const rows = [
    // Game A: two identical PS5 discs.
    { igdb_id: 1, platform_id: 167, platform_name: "PlayStation 5" },
    { igdb_id: 1, platform_id: 167, platform_name: "PlayStation 5" },
    // Game B: one on PC, one on PS5.
    { igdb_id: 2, platform_id: 6, platform_name: "PC" },
    { igdb_id: 2, platform_id: 167, platform_name: "PlayStation 5" },
    // Game C: one copy.
    { igdb_id: 3, platform_id: 130, platform_name: "Nintendo Switch" },
  ];
  assert.deepEqual(multipleCopyTotals(rows), {
    games: 3,
    games_with_multiple_copies: 2,
    games_on_multiple_platforms: 1,
  });
});

test("a copy with no platform is not a platform", () => {
  const rows = [
    { igdb_id: 1, platform_id: null, platform_name: null },
    { igdb_id: 1, platform_id: 6, platform_name: "PC" },
  ];
  assert.deepEqual(multipleCopyTotals(rows), {
    games: 1,
    games_with_multiple_copies: 1,
    games_on_multiple_platforms: 0,
  });
  assert.deepEqual(multipleCopyTotals([]), {
    games: 0,
    games_with_multiple_copies: 0,
    games_on_multiple_platforms: 0,
  });
});

test("what somebody types becomes something the slug can match", () => {
  assert.equal(copySearchTerm("Resident Evil"), "resident-evil");
  assert.equal(copySearchTerm("  Persona 5   Royal "), "persona-5-royal");
  // Accents fold, because nobody types the catalogue's spelling.
  assert.equal(copySearchTerm("Pokémon Espada"), "pokemon-espada");
  assert.equal(copySearchTerm("Collector's"), "collector-s");
  assert.equal(copySearchTerm("   "), null);
  assert.equal(copySearchTerm(""), null);
  assert.equal(copySearchTerm("a".repeat(200))?.length, 80);
});
