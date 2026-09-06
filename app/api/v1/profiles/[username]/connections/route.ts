import { segmentBefore } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { resolveUsername } from "@/lib/api/social";
import { searchTerm } from "@/lib/api/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NAME = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Somebody's followers, or who they follow.
 *
 * Paged on `created_at` rather than by offset: the list is being scrolled
 * while people are still following and unfollowing it, and an offset would
 * skip or repeat a row every time the rows above it move. The cursor is the
 * timestamp of the last one returned.
 *
 * The viewer's own relationship to each person comes back with them, resolved
 * in the same query. Asking for it per card is how a page of twenty becomes
 * twenty more requests, and doing it here is also what stops the first page
 * and the next one disagreeing about the same person.
 */
export const GET = apiRoute({
  scope: "social.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const url = new URL(request.url);
    const who = segmentBefore(request, 1, "username", NAME);
    const tab = url.searchParams.get("tab") ?? "followers";
    if (tab !== "followers" && tab !== "following")
      throw new ApiFailure(
        "invalid_request",
        "tab must be followers or following.",
      );

    const before = url.searchParams.get("before");
    if (before && Number.isNaN(Date.parse(before)))
      throw new ApiFailure("invalid_request", "before must be a timestamp.");

    const asked = Number(url.searchParams.get("limit") ?? 20);
    const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), 50) : 20;
    const term = searchTerm(request);

    const mine = tab === "followers" ? "following_id" : "follower_id";
    const theirs = tab === "followers" ? "follower_id" : "following_id";

    return await db(async (client) => {
      const target = await resolveUsername(client, who);
      const { rows } = await client.query(
        `select follow.created_at,
                person.id, person.username, person.display_name, person.bio,
                person.avatar_url, person.verified, person.account_type,
                exists(select 1 from public.follows mine
                        where mine.follower_id = $2
                          and mine.following_id = person.id) as viewer_follows,
                exists(select 1 from public.follows back
                        where back.follower_id = person.id
                          and back.following_id = $2) as follows_viewer
           from public.follows follow
           join public.profiles person on person.id = follow.${theirs}
          where follow.${mine} = $1
            and ($4::timestamptz is null or follow.created_at < $4)
            and ($5::text is null
                 or person.username ilike $5
                 or person.display_name ilike $5)
          order by follow.created_at desc
          limit $3`,
        [target, identity.profileId, limit, before, term],
      );

      return {
        data: rows.map((row) => ({
          created_at: row.created_at,
          person: {
            id: row.id,
            username: row.username,
            display_name: row.display_name,
            bio: row.bio,
            avatar_url: row.avatar_url,
            verified: row.verified,
            account_type: row.account_type,
            viewer_follows: row.viewer_follows,
            follows_viewer: row.follows_viewer,
          },
        })),
      };
    });
  },
});
