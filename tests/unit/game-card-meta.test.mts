import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { gameMetaLine, primaryGameCompany } from "../../lib/game-company";

/**
 * The small print under a game's name, and the promise that it is the same
 * everywhere.
 *
 * It had drifted: some shelves read "1997 · Square" and others
 * "1997 · Role-playing", depending on whether whoever wrote that IGDB query
 * happened to ask for the companies. Two cards side by side answering
 * different questions is worse than either answer on its own.
 */

test("the line is the year and who made it", () => {
  assert.equal(
    gameMetaLine({
      releaseYear: 1997,
      developers: ["Square"],
      publishers: ["Sony Computer Entertainment"],
    }),
    "1997 · Square",
  );
  // The publisher is the fallback, not a second line: IGDB has plenty of rows
  // that credit only one of the two.
  assert.equal(
    gameMetaLine({ releaseYear: 2011, publishers: ["Mojang"] }),
    "2011 · Mojang",
  );
});

test("nobody credited leaves the year alone", () => {
  // A genre used to stand in here, which is how the same card said different
  // things on different shelves. An author is not a category.
  assert.equal(gameMetaLine({ releaseYear: 2024 }), "2024");
  assert.equal(
    gameMetaLine({ releaseYear: 2024, developers: [], publishers: [] }),
    "2024",
  );
  assert.equal(gameMetaLine({ developers: ["Valve"] }), "Valve");
  assert.equal(gameMetaLine({}), "");
  assert.equal(gameMetaLine({ releaseYear: null, developers: null }), "");
});

test("the studio wins over the publisher", () => {
  assert.equal(
    primaryGameCompany({
      developers: ["FromSoftware"],
      publishers: ["Bandai"],
    }),
    "FromSoftware",
  );
  assert.equal(primaryGameCompany({ publishers: ["Bandai"] }), "Bandai");
  assert.equal(primaryGameCompany({}), null);
});

test("no card builds its own version of this line", async () => {
  // The drift was three hand-rolled copies of the same idea. Anything reading
  // a genre out by index into rendered text is that mistake coming back.
  const roots = ["app", "components"];
  const offenders: string[] = [];
  while (roots.length) {
    const dir = roots.pop()!;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        roots.push(full);
        continue;
      }
      if (!entry.name.endsWith(".tsx")) continue;
      const source = await readFile(full, "utf8");
      if (/\bgenres\s*\[\s*0\s*\]/.test(source)) offenders.push(full);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `these render a genre where the company belongs:\n${offenders.join("\n")}`,
  );
});

test("every IGDB query that feeds a card asks for the companies", async () => {
  // The root cause was not the components. It was queries that never asked
  // for `involved_companies`, so the company was always missing and the
  // fallback always won. A field list that names `genres` is feeding cards.
  const source = await readFile("lib/igdb.ts", "utf8");
  const missing: string[] = [];
  for (const match of source.matchAll(/([A-Za-z_]+\.)?genres\.name/g)) {
    const relation = match[1] ?? "";
    // Cheap and specific: the same prefix has to appear on an
    // `involved_companies.company.name` somewhere in the file.
    if (!source.includes(`${relation}involved_companies.company.name`))
      missing.push(`${relation}genres.name`);
  }
  assert.deepEqual(
    [...new Set(missing)],
    [],
    `these relations fetch genres but not the companies:\n${missing.join("\n")}`,
  );
});
