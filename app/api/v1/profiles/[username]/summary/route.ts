import { apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile, readProfileSummary } from "@/lib/api/profile-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      return { data: await readProfileSummary(client, profile.id) };
    }),
});
