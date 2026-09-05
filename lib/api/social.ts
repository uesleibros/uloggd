import "server-only";
import {
  offsetFor,
  pageMeta,
  PAGE_SIZE,
  requestedPage,
  withoutCount,
} from "./paging";
import { ApiFailure, apiRoute } from "./route";

/** A username to the account it names, or a refusal that says so. */
export async function resolveUsername(
  client: {
    query: (
      sql: string,
      values: unknown[],
    ) => Promise<{ rows: { id: string }[] }>;
  },
  username: string,
) {
  const { rows } = await client.query(
    "select id from public.profiles where lower(username) = lower($1) limit 1",
    [username],
  );
  if (!rows[0]) throw new ApiFailure("not_found", "No account with that name.");
  return rows[0].id;
}

/**
 * Who follows the owner, or who the owner follows.
 *
 * Only the pair and the other person's public card: this scope says who the
 * owner is connected to, never what those accounts hold.
 */
export function socialCollection(direction: "followers" | "following") {
  const mine = direction === "followers" ? "following_id" : "follower_id";
  const theirs = direction === "followers" ? "follower_id" : "following_id";

  return apiRoute({
    scope: "social.read",
    bucket: "read",
    handle: async ({ request, identity, db }) => {
      const page = requestedPage(request);
      const rows = await db(async (client) => {
        const result = await client.query(
          `select p.id, p.username, p.display_name, p.avatar_url, p.verified,
                  p.account_type, f.created_at, count(*) over() as total_count
             from public.follows f
             join public.profiles p on p.id = f.${theirs}
            where f.${mine} = $1
            order by f.created_at desc, p.id desc
            limit $2 offset $3`,
          [identity.profileId, PAGE_SIZE, offsetFor(page)],
        );
        return result.rows as Record<string, unknown>[];
      });

      return { data: withoutCount(rows), page: pageMeta(page, rows) };
    },
  });
}
