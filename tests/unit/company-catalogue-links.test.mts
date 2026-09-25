import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Everything on a company page that names a slice of its catalogue opens it.
 *
 * The rail said what a company mostly makes and where their games ship, and
 * the chart said how many came out each year, and none of it went anywhere:
 * the reader was told "396 on the 3DS" and left to go and build that search
 * by hand. The catalogue search already takes exactly these filters, so the
 * counts carry IGDB's ids rather than only names, and each one is a link.
 */

const ROOT = process.cwd();
const read = (file: string) => readFile(path.join(ROOT, file), "utf8");

test("the catalogue sweep keeps the ids the search filters by", async () => {
  const igdb = await read("lib/igdb.ts");
  // Asked for explicitly: the sweep reads a name alone perfectly well, and an
  // id that arrives only by IGDB's habit is one that can stop arriving.
  assert.match(
    igdb,
    /fields first_release_date,genres\.id,genres\.name,platforms\.id,platforms\.name;/,
  );
  assert.match(
    igdb,
    /export type CompanySlice = \{ id: number; name: string; count: number \};/,
  );
  assert.match(
    igdb,
    /genres: CompanySlice\[\];\s*\r?\n\s*platforms: CompanySlice\[\];/,
  );
});

test("the rail and the chart link to the search that reproduces them", async () => {
  const page = await read("app/[lang]/publisher/[slug]/page.tsx");
  // Genres and platforms, the two the rail counts.
  assert.match(
    page,
    /\/\$\{lang\}\/search\?publishers=\$\{companyId\}&\$\{filter\}=\$\{id\}/,
  );
  assert.match(page, /slice\("genres", genre\.id\)/);
  assert.match(page, /slice\("platforms", platform\.id\)/);
  // One year of the chart.
  assert.match(
    page,
    /search\?publishers=\$\{companyId\}&yearFrom=\$\{entry\.year\}&yearTo=\$\{entry\.year\}/,
  );
  // And the two counts in the header.
  assert.match(page, /href=\{`\$\{searchHref\}&role=publisher`\}/);
  assert.match(page, /href=\{`\$\{searchHref\}&role=developer`\}/);
});

test("the chart is no longer one image with the bars inside it", async () => {
  const page = await read("app/[lang]/publisher/[slug]/page.tsx");
  // From the element itself, so the comment above it explaining why the role
  // is gone is not read as the role still being there.
  const chart = page.slice(
    page.indexOf('className="publisher-timeline"'),
    page.indexOf("publisher-timeline-axis"),
  );
  // A reader walks past everything inside a role="img", links included.
  assert.doesNotMatch(chart, /role="img"/);
  // Each bar says its own year and count instead.
  assert.match(
    chart,
    /aria-label=\{yearLabel\(entry\.year, entry\.count, lang\)\}/,
  );
  // An empty year is a gap, not a link to nothing and not a focusable
  // element hidden from the reader.
  assert.match(chart, /data-empty\s*\r?\n\s*aria-hidden/);
});
