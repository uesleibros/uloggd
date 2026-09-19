import { apiRoute } from "@/lib/api/route";
import { searchCompanies } from "@/lib/igdb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = ["relevance", "catalog", "name", "oldest", "newest"] as const;

/**
 * Game companies, searched.
 *
 * The site's company search asked IGDB from the page itself, which made it the
 * one kind of search with no address an integration, or the site's own
 * browser, could use. Public, like the catalogue it indexes.
 */
export const GET = apiRoute({
  public: true,
  scope: "catalog.read",
  bucket: "catalog",
  handle: async ({ request }) => {
    const params = new URL(request.url).searchParams;
    const role = params.get("role");
    const sort = params.get("sort");
    const page = Number(params.get("page") ?? "1");
    const result = await searchCompanies({
      query: (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
      role: role === "publisher" || role === "developer" ? role : "any",
      status: params.get("status") === "active" ? "active" : "any",
      sort: SORTS.includes(sort as (typeof SORTS)[number])
        ? (sort as (typeof SORTS)[number])
        : "relevance",
      page: Number.isSafeInteger(page) && page >= 1 && page <= 100 ? page : 1,
    });
    return {
      data: result.companies,
      total: result.total,
      total_pages: result.totalPages,
    };
  },
});
