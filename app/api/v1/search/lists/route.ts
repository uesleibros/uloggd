import { ApiFailure, apiRoute } from "@/lib/api/route";
import { entitySearch } from "@/lib/api/search-input";
import { readListPreviews } from "@/lib/api/list-preview-read";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const input = entitySearch(request, ["recent", "oldest", "name"]);
    const kind = new URL(request.url).searchParams.get("kind") ?? "COLLECTION";
    if (kind !== "COLLECTION" && kind !== "TIERLIST")
      throw new ApiFailure(
        "invalid_request",
        "kind must be COLLECTION or TIERLIST.",
      );
    const query = input.query.replace(/[%_,()]/g, "");
    const result = await db((client) =>
      readListPreviews(client, null, identity?.profileId ?? null, {
        visibility: "PUBLIC",
        kind,
        sort: input.sort as "recent" | "oldest" | "name",
        limit: 24,
        offset: (input.page - 1) * 24,
        query: query.length >= 2 ? query : undefined,
      }),
    );
    return { data: result.data, total: result.matching };
  },
});
