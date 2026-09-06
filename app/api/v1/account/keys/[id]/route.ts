import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "key id", UUID);
    const revoked = await db(async (client) => {
      const { rows } = await client.query<{ done: boolean }>(
        "select public.revoke_api_key(key_id => $1) as done",
        [id],
      );
      return rows[0]?.done ?? false;
    });
    if (!revoked)
      throw new ApiFailure("not_found", "No key of yours with that id.");
    return { data: { id, revoked: true } };
  },
});
