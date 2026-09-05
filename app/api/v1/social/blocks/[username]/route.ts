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
          "An account cannot block itself.",
        );

      // Blocking also undoes a follow in both directions, which is the
      // database's doing rather than this route's.
      await client.query("select public.block_profile(target_profile => $1)", [
        target,
      ]);
      return { data: { username, blocked: true } };
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
      await client.query(
        "select public.unblock_profile(target_profile => $1)",
        [target],
      );
      return { data: { username, blocked: false } };
    });
  },
});
