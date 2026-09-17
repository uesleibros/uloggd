import { apiRoute } from "@/lib/api/route";
import { getGamesByIds } from "@/lib/igdb";
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
      const data = rows.slice(0, limit);
      const has_more = rows.length > limit;

      // `games=1` hydrates the catalogue entry for every row in the page.
      //
      // A library row is an id and a status; a library screen is covers and
      // names. Asking separately means the caller cannot draw anything until
      // two round trips have finished, and the ids for the second one only
      // exist after the first. Answered together, one call draws the page.
      if (new URL(request.url).searchParams.get("games") !== "1")
        return { data, has_more };
      return {
        data,
        has_more,
        games: await getGamesByIds(data.map((row) => row.igdb_id)),
      };
    });
  },
});
