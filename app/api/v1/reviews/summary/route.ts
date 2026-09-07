import { apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "reviews.read",
  bucket: "read",
  handle: async ({ identity, db }) =>
    db(async (client) => {
      const [index, count] = await Promise.all([
        client.query(
          "select * from public.get_review_workspace_index(target_profile => $1)",
          [identity.profileId],
        ),
        client.query(
          "select count(*)::int as count from public.journeys where profile_id = $1",
          [identity.profileId],
        ),
      ]);
      return { data: index.rows, journeys: count.rows[0].count };
    }),
});
