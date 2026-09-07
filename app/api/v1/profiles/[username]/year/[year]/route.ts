import { ApiFailure, apiRoute } from "@/lib/api/route";
import { lastSegment, segmentBefore, HANDLE } from "@/lib/api/path";
import { readProfile } from "@/lib/api/profile-read";
import { parseWrappedYear } from "@/lib/year-wrapped";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const year = parseWrappedYear(lastSegment(request, "year", /^\d{4}$/));
    if (!year)
      throw new ApiFailure("invalid_request", "That year is not available.");
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 2, "username", HANDLE),
      );
      const [{ rows: sessions }, { rows: reviews }] = await Promise.all([
        client.query(
          `select igdb_id,played_on,minutes,marks_finish
          from public.diary_entries where profile_id = $1
          and played_on >= $2::date and played_on < $3::date`,
          [profile.id, `${year}-01-01`, `${year + 1}-01-01`],
        ),
        client.query(
          `select rating,created_at from public.reviews
          where profile_id = $1 and created_at >= $2::timestamptz and created_at < $3::timestamptz`,
          [
            profile.id,
            `${year}-01-01T00:00:00Z`,
            `${year + 1}-01-01T00:00:00Z`,
          ],
        ),
      ]);
      return { data: { sessions, reviews } };
    });
  },
});
