import { ApiFailure, apiRoute } from "@/lib/api/route";
import { readLibrarySeries } from "@/lib/library-series-data";
import type { SlotHolding } from "@/lib/series-policy";
import {
  selectSeries,
  SERIES_PAGE_SIZE,
  type SeriesFilter,
  type SeriesSort,
} from "@/lib/series-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const params = new URL(request.url).searchParams;
    // A viewer identity is the only owner selector, regardless of library visibility.
    if (params.has("username") || params.has("profile_id"))
      throw new ApiFailure(
        "invalid_request",
        "Series progress belongs to the caller only.",
      );
    const summary = params.get("summary") === "1";
    const keys = params.get("keys")?.split(",") ?? null;
    if (
      keys &&
      (keys.length > SERIES_PAGE_SIZE ||
        keys.some((key) => !/^(collection|franchise):[1-9][0-9]*$/.test(key)))
    )
      throw new ApiFailure(
        "invalid_request",
        "Request at most one page of series keys.",
      );
    const own = await db(async (client) => {
      const library = await client.query<SlotHolding>(
        "select igdb_id, status, playing from public.user_games where profile_id = $1 order by igdb_id",
        [identity.profileId],
      );
      const ignored = await client.query<{ igdb_id: number }>(
        "select igdb_id from public.ignored_games where profile_id = $1 order by igdb_id",
        [identity.profileId],
      );
      return {
        rows: library.rows,
        ignored: ignored.rows.map((row) => row.igdb_id),
      };
    });
    // The transaction has ended before the catalogue network work starts.
    const shelves = await readLibrarySeries(own.rows, summary);
    const index = shelves.map(({ slots, ...entry }) => ({
      ...entry,
      slots: slots.map(({ id, state }) => ({ id, state })),
    }));
    const requestedFilter = params.get("filter");
    const filter: SeriesFilter =
      requestedFilter === "progress" || requestedFilter === "completed"
        ? requestedFilter
        : "all";
    const sort: SeriesSort =
      params.get("sort") === "name" ? "name" : "progress";
    const selected = selectSeries(index, new Set(own.ignored), {
      filter,
      sort,
      query: (params.get("q") ?? "").slice(0, 200),
      page: Number(params.get("page")),
    });
    const visible = new Set(keys ?? selected.rows.map((row) => row.entry.key));
    return {
      data: shelves.filter((shelf) => summary || visible.has(shelf.key)),
      index: summary ? [] : index,
      ignored: own.ignored,
      counts: selected.counts,
      page: selected.page,
      total_pages: selected.totalPages,
    };
  },
});
