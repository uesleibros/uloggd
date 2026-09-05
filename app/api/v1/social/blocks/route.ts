import { apiRoute } from "@/lib/api/route";
import {
  offsetFor,
  pageMeta,
  PAGE_SIZE,
  requestedPage,
  withoutCount,
} from "@/lib/api/paging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who the owner has blocked.
 *
 * Only that direction exists. The policy on `blocks` lets an account read the
 * rows where it is the blocker, so who blocked you is not a question this or
 * any other key can ask.
 */
export const GET = apiRoute({
  scope: "social.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const page = requestedPage(request);
    const rows = await db(async (client) => {
      const result = await client.query(
        `select p.id, p.username, p.display_name, p.avatar_url, p.verified,
                p.account_type, b.created_at, count(*) over() as total_count
           from public.blocks b
           join public.profiles p on p.id = b.blocked_id
          where b.blocker_id = $1
          order by b.created_at desc, p.id desc
          limit $2 offset $3`,
        [identity.profileId, PAGE_SIZE, offsetFor(page)],
      );
      return result.rows as Record<string, unknown>[];
    });

    return { data: withoutCount(rows), page: pageMeta(page, rows) };
  },
});
