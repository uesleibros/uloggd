import { ApiFailure, apiRoute } from "@/lib/api/route";
import { lastSegment, HANDLE } from "@/lib/api/path";
import { PROFILE_COLUMNS, PROFILE_TARGET } from "@/lib/api/profile-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `with target as (${PROFILE_TARGET}),
      profile as (select ${PROFILE_COLUMNS} from public.profiles where id=(select id from target))
      select to_jsonb(profile) as data,
        coalesce((select jsonb_agg(s) from public.profile_suspension(target => profile.id) s),'[]'::jsonb) as suspension
      from profile`,
        [lastSegment(request, "username", HANDLE)],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No account with that name.");
      return rows[0];
    }),
});
