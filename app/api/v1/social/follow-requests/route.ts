import { apiRoute } from "@/lib/api/route";
import {
  offsetFor,
  pageMeta,
  PAGE_SIZE,
  requestedPage,
  withoutCount,
} from "@/lib/api/paging";
import { searchTerm } from "@/lib/api/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who has asked to follow a private account and is still waiting.
 *
 * Only the incoming direction exists. The outgoing one (what this account has
 * asked of others) is the other person's queue to answer, and listing it here
 * would be reading a decision that has not been made about somebody else.
 */
export const GET = apiRoute({
  scope: "social.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const page = requestedPage(request);
    const term = searchTerm(request);

    const rows = await db(async (client) => {
      const result = await client.query(
        `select asker.id, asker.username, asker.display_name, asker.avatar_url,
                asker.verified, ask.created_at, count(*) over() as total_count
           from public.follow_requests ask
           join public.profiles asker on asker.id = ask.requester_id
          where ask.target_id = $1
            and ($4::text is null
                 or asker.username ilike $4
                 or asker.display_name ilike $4)
          order by ask.created_at desc, asker.id desc
          limit $2 offset $3`,
        [identity.profileId, PAGE_SIZE, offsetFor(page), term],
      );
      return result.rows as Record<string, unknown>[];
    });

    return { data: withoutCount(rows), page: pageMeta(page, rows) };
  },
});
