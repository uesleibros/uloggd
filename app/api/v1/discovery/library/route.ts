import { apiRoute } from "@/lib/api/route";
import { getPlayNext } from "@/lib/api/play-next-read";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: async ({ db, identity }) => ({
    data: await db((client) => getPlayNext(client, identity.profileId)),
  }),
});
