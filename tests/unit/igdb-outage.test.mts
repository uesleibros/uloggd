import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * When IGDB does not answer, the pages built mostly from our own data stay up.
 *
 * Simulated with credentials Twitch refuses: the home page, every profile,
 * every list and the search all turned into "something went wrong", because a
 * shelf of covers threw and the error climbed to the route's boundary. The
 * readers that only decorate a page answer with less now, and the sections
 * that would draw that as "empty" say the games could not be loaded instead.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the readers that decorate a page degrade instead of throwing", async () => {
  const igdb = await read("lib/igdb.ts");
  for (const what of [
    "popular games",
    "discovery shelves",
    "genre shelves",
    "games by id",
    "games by slug",
    "catalogue filter options",
    "selected publishers",
  ])
    assert.match(igdb, new RegExp(`unavailable\\("${what}"`), what);
});

test("a failed lookup is never remembered as a missing game", async () => {
  const igdb = await read("lib/igdb.ts");
  // The early return comes before the memo is written, so the ids are asked
  // for again once IGDB is back rather than hidden for the memo's lifetime.
  const byId = igdb.slice(igdb.indexOf("export async function getGamesByIds"));
  assert.ok(
    byId.indexOf("if (!fetched) return found;") <
      byId.indexOf("gameMemo.set(game.id"),
  );
});

test("a list or library whose games did not load says so", async () => {
  const list = await read("app/[lang]/lists/[id]/page.tsx");
  assert.match(list, /if \(items\.length && !byId\.size\)/);
  const library = await read("components/library/library-loader.tsx");
  assert.match(library, /if \(records\.length && !games\.length\)/);
});
