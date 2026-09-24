import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A placeholder holds the room its content will take.
 *
 * Measured on a phone: a collection of 34 games behind a grid of ten squares,
 * and a page of 24 search results behind six, both let everything below them
 * jump down the moment the real thing arrived (0.13 and 0.07 of layout shift).
 * The counts are read from what is being waited for, not guessed.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("a collection's placeholder has one cell per game in the list", async () => {
  const page = await read("app/[lang]/lists/[id]/page.tsx");
  assert.match(page, /<CollectionGridSkeleton count=\{items\.length\}/);
  const skeleton = await read("components/social/collection-grid-skeleton.tsx");
  // The grid the real cards use, so the columns and gaps cannot drift apart.
  assert.match(skeleton, /className="library-grid list-items-loading"/);
  const loading = await read("app/[lang]/lists/[id]/loading.tsx");
  assert.match(loading, /<CollectionGridSkeleton \/>/);
});

test("the search placeholder holds a page of results", async () => {
  // The count travels from the page size into the skeleton, which is now its
  // own component so the shape of a waiting result can follow the card it
  // becomes rather than being a rectangle declared inline.
  const workspace = await read("components/entity-search-workspace.tsx");
  assert.match(
    workspace,
    /<EntityResultsSkeleton scope=\{scope\} count=\{perPage\}/,
  );
  const skeleton = await read("components/entity-results-skeleton.tsx");
  assert.match(skeleton, /Array\.from\(\{ length: count \}/);
  // The same grid the results land in, so the columns cannot drift apart.
  assert.match(skeleton, /className="entity-search-grid"/);
  const client = await read("components/entity-search-client.tsx");
  assert.match(client, /perPage=\{perPage\}/);
});

test("the game skeleton is as tall as a game page", async () => {
  const loading = await read("app/[lang]/game/[slug]/loading.tsx");
  assert.match(loading, /game-route-skeleton-body/);
  assert.match(loading, /game-route-skeleton-panels/);
  const css = await read("app/globals.css");
  // At the top level, not inside a media query, or it applies to nothing.
  assert.match(
    css,
    /\r?\n\.game-route-skeleton-panels > span \{\r?\n {2}height: \d+px;/,
  );
});
