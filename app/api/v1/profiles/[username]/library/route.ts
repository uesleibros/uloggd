import { apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";
import { countedLimit, requestedPage } from "@/lib/api/paging";
import type { ProfileLibraryRecord } from "@/lib/profile-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "library.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const limit = countedLimit(request, 100, 1000);
    const page = requestedPage(request);
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      const { rows } = await client.query<ProfileLibraryRecord>(
        `select igdb_id,status,playing,backlog,wishlist,liked,quick_rating,
                custom_cover_url,updated_at
           from public.user_games where profile_id = $1
          order by updated_at desc, igdb_id desc limit $2 offset $3`,
        [profile.id, limit + 1, (page - 1) * limit],
      );
      return { data: rows.slice(0, limit), has_more: rows.length > limit };
    });
  },
});
