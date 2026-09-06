import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const id = lastSegment(request, "notification id", UUID);

    // Marking one read twice is not a conflict, so the second call reports the
    // time the first one wrote rather than moving it.
    const read = await db(async (client) => {
      const { rows } = await client.query<{ read_at: string }>(
        `update public.notifications
            set read_at = coalesce(read_at, now())
          where id = $1 and recipient_id = $2
        returning read_at`,
        [id, identity.profileId],
      );
      return rows[0]?.read_at ?? null;
    });

    if (!read)
      throw new ApiFailure("not_found", "No notification of yours with that id.");
    return { data: { id, read_at: read } };
  },
});
