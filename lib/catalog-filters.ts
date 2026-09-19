import type { CatalogSearchFilters } from "@/lib/igdb";

/**
 * A catalogue search, read from a URL.
 *
 * One reader for both sides of the search. The page reads it to draw the
 * filters the visitor chose, and the API reads it to answer them. They used to
 * be one place because the page did the searching itself; now the browser asks
 * `/api/v1/games` for the results, and two copies of these rules would be two
 * readings of the same address that could quietly disagree about what was
 * asked.
 *
 * Every value is bounded rather than trusted: this is a public address, and
 * anything a link can carry, a link can carry badly.
 */

type Source = { get(name: string): string | null };

function numberList(value: string | null) {
  return (value ?? "")
    .split(",")
    .map(Number)
    .filter((item) => Number.isSafeInteger(item) && item > 0)
    .slice(0, 24);
}

function nameList(value: string | null) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.normalize("NFKC").trim())
        .filter((item) => item.length > 0 && item.length <= 80),
    ),
  ].slice(0, 24);
}

function boundedNumber(value: string | null, minimum: number, maximum: number) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

const SORTS = new Set<CatalogSearchFilters["sort"]>([
  "popular",
  "rating",
  "newest",
  "oldest",
  "hype",
  "name",
]);

export function readCatalogFilters(source: Source): CatalogSearchFilters {
  const sort = source.get("sort");
  const role = source.get("role");
  const release = source.get("release");
  return {
    query: (source.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
    genres: numberList(source.get("genres")),
    platforms: numberList(source.get("platforms")),
    themes: numberList(source.get("themes")),
    modes: numberList(source.get("modes")),
    engines: nameList(source.get("engines")),
    types: numberList(source.get("types")),
    perspectives: numberList(source.get("perspectives")),
    publishers: numberList(source.get("publishers")),
    publisherRole: role === "publisher" || role === "developer" ? role : "any",
    releaseStatus:
      release === "released" || release === "upcoming" ? release : "all",
    ratedOnly: source.get("rated") === "1",
    anticipatedOnly: source.get("anticipated") === "1",
    yearFrom: boundedNumber(source.get("yearFrom"), 1950, 2100),
    yearTo: boundedNumber(source.get("yearTo"), 1950, 2100),
    ratingMin: boundedNumber(source.get("rating"), 0, 100),
    ratingCountMin: boundedNumber(source.get("votes"), 0, 10_000_000),
    sort: SORTS.has(sort as CatalogSearchFilters["sort"])
      ? (sort as CatalogSearchFilters["sort"])
      : "popular",
    page: boundedNumber(source.get("page"), 1, 100) ?? 1,
  };
}

/**
 * The same search, written back as the query string `readCatalogFilters`
 * reads. Defaults are left out, so the address stays as short as the search.
 */
export function writeCatalogFilters(filters: CatalogSearchFilters) {
  const params = new URLSearchParams();
  const list = (name: string, values: (number | string)[]) => {
    if (values.length) params.set(name, values.join(","));
  };
  if (filters.query) params.set("q", filters.query);
  list("genres", filters.genres);
  list("platforms", filters.platforms);
  list("themes", filters.themes);
  list("modes", filters.modes);
  list("engines", filters.engines);
  list("types", filters.types);
  list("perspectives", filters.perspectives);
  list("publishers", filters.publishers);
  if (filters.publisherRole !== "any")
    params.set("role", filters.publisherRole);
  if (filters.releaseStatus !== "all")
    params.set("release", filters.releaseStatus);
  if (filters.ratedOnly) params.set("rated", "1");
  if (filters.anticipatedOnly) params.set("anticipated", "1");
  if (filters.yearFrom !== null)
    params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo !== null) params.set("yearTo", String(filters.yearTo));
  if (filters.ratingMin !== null)
    params.set("rating", String(filters.ratingMin));
  if (filters.ratingCountMin !== null)
    params.set("votes", String(filters.ratingCountMin));
  if (filters.sort !== "popular") params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}
