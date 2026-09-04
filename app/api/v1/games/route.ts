import { searchCatalogGames, type CatalogSearchFilters } from "@/lib/igdb";
import { publicGame, type Page } from "@/lib/api/shapes";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = [
  "popular",
  "rating",
  "newest",
  "oldest",
  "hype",
  "name",
] as const;

const PAGE_SIZE = 24;

function emptyFilters(): CatalogSearchFilters {
  return {
    query: "",
    genres: [],
    platforms: [],
    themes: [],
    modes: [],
    engines: [],
    types: [],
    perspectives: [],
    publishers: [],
    publisherRole: "any",
    releaseStatus: "all",
    ratedOnly: false,
    anticipatedOnly: false,
    yearFrom: null,
    yearTo: null,
    ratingMin: null,
    ratingCountMin: null,
    sort: "popular",
    page: 1,
  };
}

export const GET = apiRoute({
  scope: "catalog.read",
  bucket: "catalog",
  handle: async ({ request }) => {
    const params = new URL(request.url).searchParams;

    const page = Number(params.get("page") ?? "1");
    if (!Number.isSafeInteger(page) || page < 1 || page > 100)
      throw new ApiFailure(
        "invalid_request",
        "page must be a whole number between 1 and 100.",
      );

    const sort = params.get("sort") ?? "popular";
    if (!SORTS.includes(sort as (typeof SORTS)[number]))
      throw new ApiFailure(
        "invalid_request",
        `sort must be one of ${SORTS.join(", ")}.`,
      );

    const query = (params.get("q") ?? "").trim().slice(0, 120);

    const result = await searchCatalogGames({
      ...emptyFilters(),
      query,
      sort: sort as CatalogSearchFilters["sort"],
      page,
    });

    const meta: Page = {
      number: result.page,
      size: PAGE_SIZE,
      total_items: result.total,
      total_pages: result.totalPages,
      has_more: result.hasMore,
    };

    return { data: result.games.map(publicGame), page: meta };
  },
});
