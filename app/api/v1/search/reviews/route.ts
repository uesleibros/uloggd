import { apiRoute } from "@/lib/api/route";
import { entitySearch } from "@/lib/api/search-input";
import { readActivity } from "@/lib/api/activity-read";
import { countActivityRows } from "@/lib/api/activity-query";
import type { ActivityOptions } from "@/lib/activity-types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "reviews.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const input = entitySearch(request, ["recent", "oldest", "rating"]);
    const options: ActivityOptions = {
      search: input.query,
      order: input.sort as ActivityOptions["order"],
      kinds: ["review"],
      limit: 20,
      offset: (input.page - 1) * 20,
    };
    return db(async (client) => {
      const total = await countActivityRows(client, "review", options);
      return {
        total,
        data: await readActivity(client, identity?.profileId ?? null, options),
      };
    });
  },
});
