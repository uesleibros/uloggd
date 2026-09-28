import { ApiFailure, apiRoute } from "@/lib/api/route";
import { entitySearch } from "@/lib/api/search-input";
import { readListPreviews } from "@/lib/api/list-preview-read";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  // The same answer for everybody, and one that changes by the hour at most:
  // the home page asks for the three most liked lists on every visit, and
  // going back to it should not mean waiting for the database and the
  // catalogue to say what they said a moment ago.
  browserCache: () => 60,
  handle: async ({ request, identity, db }) => {
    const input = entitySearch(request, ["recent", "oldest", "name", "likes"]);
    const params = new URL(request.url).searchParams;
    const kind = params.get("kind") ?? "COLLECTION";
    if (kind !== "COLLECTION" && kind !== "TIERLIST" && kind !== "ALL")
      throw new ApiFailure(
        "invalid_request",
        "kind must be COLLECTION, TIERLIST or ALL.",
      );
    const limit = Number(params.get("limit") ?? 24);
    if (!Number.isInteger(limit) || limit < 1 || limit > 24)
      throw new ApiFailure(
        "invalid_request",
        "limit must be between 1 and 24.",
      );
    const query = input.query.replace(/[%_,()]/g, "");
    const result = await db((client) =>
      readListPreviews(client, null, identity?.profileId ?? null, {
        visibility: "PUBLIC",
        kind: kind === "ALL" ? undefined : kind,
        sort: input.sort as "recent" | "oldest" | "name" | "likes",
        limit,
        offset: (input.page - 1) * limit,
        query: query.length >= 2 ? query : undefined,
      }),
    );
    return { data: result.data, total: result.matching };
  },
});
