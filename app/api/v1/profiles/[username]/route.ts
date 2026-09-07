import { apiRoute } from "@/lib/api/route";
import { lastSegment, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const data = await readProfile(
        client,
        lastSegment(request, "username", HANDLE),
      );
      const { rows: suspension } = await client.query(
        "select * from public.profile_suspension(target => $1)",
        [data.id],
      );
      return { data, suspension };
    }),
});
