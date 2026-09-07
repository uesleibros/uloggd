import { ApiFailure, apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { PROFILE_TARGET } from "@/lib/api/profile-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `with target as (${PROFILE_TARGET}) select
      coalesce((select jsonb_agg(m) from public.profile_minerals(target => target.id) m),'[]'::jsonb) as data,
      (select to_jsonb(l) from public.profile_level(target => target.id) l) as standing
      from target`,
        [segmentBefore(request, 1, "username", HANDLE)],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No account with that name.");
      return rows[0];
    }),
});
