import { countedLimit } from "@/lib/api/paging";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the owner looked at, most recent first.
 *
 * The rows follow the account rather than the browser, which is the point:
 * "recently viewed" that lives in one device's storage is a different list on
 * every device, and this one is the same everywhere.
 */
export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const limit = countedLimit(request, 6, 50);

    const seen = await db(async (client) => {
      const { rows } = await client.query(
        `select game_igdb_id, viewed_at
           from public.content_views
          where viewer_id = $1 and content_type = 'game'
            and game_igdb_id is not null
          order by viewed_at desc
          limit $2`,
        [identity.profileId, limit],
      );
      return rows;
    });
    return { data: seen };
  },
});

export const DELETE = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ identity, db }) => {
    const removed = await db(async (client) => {
      const { rowCount } = await client.query(
        `delete from public.content_views
          where viewer_id = $1 and content_type = 'game'`,
        [identity.profileId],
      );
      return rowCount ?? 0;
    });
    return { data: { removed } };
  },
});
