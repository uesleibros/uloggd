import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The order the search panel offers its rows in.
 *
 * Arrow keys walked the games array alone, so the people a search surfaced
 * were reachable with a mouse and invisible to a keyboard. Fixing that put an
 * ordering in two
 * places: the key handler picks `options[activeIndex]`, and the renderer stamps
 * each row with an index computed from the section lengths. If those two ever
 * disagree, pressing Enter opens a different row than the one highlighted,
 * which is worse than no keyboard support at all.
 *
 * The renderer's offsets are asserted against the source, since rendering React
 * here would need a DOM this project does not test with. The ordering itself is
 * exercised directly.
 */
const source = await readFile(
  path.join(process.cwd(), "components", "game-search.tsx"),
  "utf8",
);

/** Mirrors `navigableOptions` without importing JSX into the test runner. */
function options(
  query: string,
  recent: string[],
  results: string[],
  people: string[],
) {
  if (query.trim().length < 2) return recent.map((slug) => `game:${slug}`);
  return [
    ...results.map((slug) => `game:${slug}`),
    ...people.map((username) => `person:${username}`),
  ];
}

test("a short query offers recently viewed and nothing else", () => {
  const flat = options("a", ["zelda", "celeste"], ["ignored"], ["someone"]);
  assert.deepEqual(flat, ["game:zelda", "game:celeste"]);
});

test("a real query offers games, then people", () => {
  const flat = options("cel", ["ignored"], ["celeste"], ["celia"]);
  assert.deepEqual(flat, ["game:celeste", "person:celia"]);
});

test("the header panel offers games and people only", async () => {
  // Lists belong to the search page. Here they were a third section that made
  // the quick answer slower to read and cost a database query on every
  // keystroke, so nothing in this panel may reach for one again.
  assert.ok(
    !/lists\.map|SearchList|t\.lists/.test(source),
    "the header search is offering lists again",
  );
  const route = await readFile(
    path.join(process.cwd(), "app", "api", "igdb", "search", "route.ts"),
    "utf8",
  );
  assert.ok(
    !route.includes("game_lists"),
    "the search endpoint queries lists again, on every keystroke",
  );
});

test("the renderer offsets each section by the ones before it", () => {
  // People start after the games, lists after games and people. Written as
  // source assertions because a mismatch here is silent: every row still
  // renders, they just answer to the wrong index.
  assert.match(
    source,
    /people\.map\(\(person, offset\) => \{\s*const index = results\.length \+ offset;/,
    "the people section no longer offsets by the games above it",
  );
});

test("every section is one listbox with labelled groups", () => {
  // Separate listboxes cannot carry a single active option between them,
  // which is what aria-activedescendant on the input has to point at.
  assert.match(
    source,
    /className="search-results"\s*role="listbox"/,
    "the results panel is no longer a single listbox",
  );
  assert.equal(
    (source.match(/role="group"/g) ?? []).length,
    2,
    "expected exactly one group per section: games and people",
  );
  assert.ok(
    !source.includes('role="list"'),
    "a section is still a plain list, so its rows are not options",
  );
});

test("the active descendant is dropped when it points past the end", () => {
  assert.match(
    source,
    /activeIndex >= 0 && activeIndex < optionCount/,
    "a shrinking result set can leave the input pointing at a missing option",
  );
});

test("clearing recently viewed actually sends the delete", async () => {
  // The Supabase query builder is lazy: it sends nothing until something
  // awaits it. This call was `void`ed, which discards it without executing, so
  // the list disappeared from the screen and came back on the next open, with
  // nothing failing and nothing logged because nothing had happened.
  const clear = source.match(
    /const clearRecent = useCallback\([\s\S]*?\}, \[[^\]]*\]\);/,
  )?.[0];
  assert.ok(clear, "the clear callback moved or was renamed");
  assert.ok(
    /await createClient\(\)/.test(clear),
    "the delete is not awaited, so it never reaches the database",
  );
  assert.ok(
    !/void createClient\(\)[\s\S]*?\.delete\(\)/.test(clear),
    "the delete is discarded without executing again",
  );
  // The screen must not claim a history was cleared that is still there.
  assert.ok(
    /if \(error\) setRecent\(previous\)/.test(clear),
    "a failed delete leaves the list looking cleared",
  );
});
