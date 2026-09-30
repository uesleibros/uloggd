import assert from "node:assert/strict";
import test from "node:test";
import {
  readCatalogFilters,
  writeCatalogFilters,
} from "../../lib/catalog-filters.ts";
import {
  CATALOG_MAX_PAGE,
  CATALOG_SORTS,
  CATALOG_YEAR_MIN,
  CATALOG_YEAR_MAX,
} from "../../lib/catalog-policy.ts";

test("shared catalogue links preserve combined filters and supported sorts", () => {
  for (const sort of CATALOG_SORTS) {
    const filters = readCatalogFilters(
      new URLSearchParams({
        q: "  some   game ",
        genres: "12,31",
        platforms: "6",
        engines: "Unity",
        sort,
        release: "released",
        rated: "1",
        anticipated: "1",
        publishers: "42",
        role: "developer",
        yearFrom: String(CATALOG_YEAR_MIN),
        yearTo: String(CATALOG_YEAR_MAX),
        page: String(CATALOG_MAX_PAGE),
        rating: "80",
        votes: "40",
      }),
    );
    assert.deepEqual(readCatalogFilters(writeCatalogFilters(filters)), filters);
    assert.equal(filters.query, "some game");
  }
});

test("fractional pagination and release years cannot reach the catalogue query", () => {
  for (const value of ["1.5", "-1", "Infinity", "NaN"]) {
    const filters = readCatalogFilters(
      new URLSearchParams({ page: value, yearFrom: value, yearTo: value }),
    );
    assert.equal(filters.page, 1);
    assert.equal(filters.yearFrom, null);
    assert.equal(filters.yearTo, null);
  }
  assert.equal(
    readCatalogFilters(
      new URLSearchParams({ page: String(CATALOG_MAX_PAGE + 1) }),
    ).page,
    1,
  );
});

test("invalid sorts and unsafe filter ids fall back without being interpolated", () => {
  const filters = readCatalogFilters(
    new URLSearchParams({
      sort: "name; drop table",
      genres: "12,0,-1,2.5,Infinity,9007199254740992",
      engines: " Unity ,Unity",
    }),
  );
  assert.equal(filters.sort, "popular");
  assert.deepEqual(filters.genres, [12]);
  assert.deepEqual(filters.engines, ["Unity"]);
});
