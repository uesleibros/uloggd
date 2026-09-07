import { getLibraryPool } from "@/lib/api/library-pool-read";
import { apiRoute } from "@/lib/api/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: async ({ identity, db }) => ({
    data: await db((client) => getLibraryPool(client, identity.profileId)),
  }),
});
