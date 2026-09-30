/** Shared by URL parsing, the API, the catalogue query and the test catalogue. */
export const CATALOG_PAGE_SIZE = 24;
export const CATALOG_MAX_PAGE = 100;
export const CATALOG_FILTER_LIMIT = 24;
export const CATALOG_YEAR_MIN = 1950;
export const CATALOG_YEAR_MAX = 2100;
export const CATALOG_SORTS = [
  "popular",
  "rating",
  "newest",
  "oldest",
  "hype",
  "name",
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
