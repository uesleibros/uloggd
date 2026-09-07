import { apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";

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
      const [{ rows: data }, { rows: levels }] = await Promise.all([
        client.query("select * from public.profile_minerals(target => $1)", [
          profile.id,
        ]),
        client.query("select * from public.profile_level(target => $1)", [
          profile.id,
        ]),
      ]);
      return { data, standing: levels[0] ?? null };
    }),
});
