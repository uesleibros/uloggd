import { HANDLE, lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { resolveUsername } from "@/lib/api/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PUT = apiRoute({
  scope: "social.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const username = lastSegment(request, "username", HANDLE);

    return await db(async (client) => {
      const target = await resolveUsername(client, username);
      if (target === identity.profileId)
        throw new ApiFailure(
          "invalid_request",
          "An account cannot follow itself.",
        );

      // Not an insert. Following a private account is a request rather than a
      // follow, and the database refuses a direct write for exactly that
      // reason: the row would have skipped the question.
      const { rows } = await client.query<{ outcome: string }>(
        "select public.request_follow(target_profile => $1) as outcome",
        [target],
      );
      const outcome = rows[0]?.outcome;

      return {
        data: {
          username,
          following: outcome === "following",
          requested: outcome === "requested",
        },
      };
    });
  },
});

export const DELETE = apiRoute({
  scope: "social.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const username = lastSegment(request, "username", HANDLE);

    return await db(async (client) => {
      const target = await resolveUsername(client, username);

      // Two ways to stop following, and the caller cannot tell which one
      // applies: a request on a private account never became a follow. Both
      // are no-ops when there is nothing to undo, so both are safe to run.
      await client.query(
        "select public.cancel_follow_request(target_profile => $1)",
        [target],
      );
      const { rows } = await client.query<{ reciprocal_removed: boolean }>(
        "select reciprocal_removed from public.unfollow_profile(target_profile => $1)",
        [target],
      );

      return {
        data: {
          username,
          following: false,
          requested: false,
          reciprocal_removed: rows[0]?.reciprocal_removed ?? false,
        },
      };
    });
  },
});
