import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const id = lastSegment(request, "image id", UUID);
    const removed = await db(async (client) => {
      const { rowCount } = await client.query(
        `delete from public.profile_image_history
          where id = $1 and profile_id = $2`,
        [id, identity.profileId],
      );
      return rowCount ?? 0;
    });
    if (removed === 0)
      throw new ApiFailure("not_found", "No picture of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
