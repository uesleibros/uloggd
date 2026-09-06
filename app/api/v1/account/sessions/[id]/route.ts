import { lastSegment, UUID } from "@/lib/api/path";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "session id", UUID);
    await db((client) =>
      client.query("select public.revoke_own_session(target => $1)", [id]),
    );
    return { data: { id, revoked: true } };
  },
});
