import { lastSegment } from "@/lib/api/path";
import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Letting go of a linked account.
 *
 * Only the undoing. Linking one is an OAuth round trip that has to come back
 * to a page, so it starts and ends in the browser and never passes through
 * here; forgetting one is a single write and belongs where the writes are.
 */
export const DELETE = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const service = lastSegment(request, "service", /^(twitch|steam)$/);
    await db((client) =>
      client.query(`select public.disconnect_${service}()`),
    );
    return { data: { service, connected: false } };
  },
});
