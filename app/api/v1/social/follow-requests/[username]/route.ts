import { HANDLE, lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { resolveUsername } from "@/lib/api/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Answering a request, one way in each verb.
 *
 * PUT approves and DELETE declines, and both remove the request either way:
 * only approving also creates the follow. The database answers false when
 * there was nothing waiting, which is a 404 rather than a silent success:
 * approving a request that was withdrawn should not read as approved.
 */
function answer(approve: boolean) {
  return apiRoute({
    scope: "social.write",
    bucket: "write",
    handle: async ({ request, db }) => {
      const username = lastSegment(request, "username", HANDLE);

      return await db(async (client) => {
        const asker = await resolveUsername(client, username);
        const { rows } = await client.query<{ answered: boolean }>(
          `select public.review_follow_request(
             requester => $1, approve => $2) as answered`,
          [asker, approve],
        );
        if (!rows[0]?.answered)
          throw new ApiFailure(
            "not_found",
            "That account is not waiting on you.",
          );
        return { data: { username, approved: approve } };
      });
    },
  });
}

export const PUT = answer(true);
export const DELETE = answer(false);
