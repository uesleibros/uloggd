import { searchCatalogGames } from "@/lib/igdb";
import { readCatalogFilters } from "@/lib/catalog-filters";
import { getSpawndGame } from "@/lib/spawnd";
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

/**
 * The catalogue, searched and filtered.
 *
 * Public, because the catalogue is: every game here is on a public page of the
 * site already, and the site's own search asks this from the browser, signed in
 * or not. It used to answer only a query, a sort and a page, which is why the
 * search page could not use it and searched on the server instead, holding the
 * whole page until IGDB answered. It reads every filter the page offers now,
 * through the same reader the page uses, so the two cannot disagree about what
 * a link means.
 *
 * `page` and `sort` still refuse a bad value outright rather than falling back:
 * they are the two an integration is most likely to get wrong, and a silent
 * default would look like a result.
 */
export const GET = apiRoute({
  public: true,
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

    const result = await searchCatalogGames(readCatalogFilters(params));

    const meta: Page = {
      number: result.page,
      size: PAGE_SIZE,
      total_items: result.total,
      total_pages: result.totalPages,
      has_more: result.hasMore,
    };

    return {
      data: result.games.map((game) => ({
        ...publicGame(game),
        // Whether the game can be played on Spawnd. Answered here because the
        // list behind it is a large file the browser has no reason to carry.
        spawnd_available: getSpawndGame({
          igdbId: game.id,
          steamAppId: game.steamAppId,
          lang: "en",
        }).available,
      })),
      page: meta,
    };
  },
});
