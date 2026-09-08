import { apiRoute } from "@/lib/api/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ db }) =>
    db(async (client) => {
      const data: Record<string, unknown[]> = {};
      // RLS filters each source and its joined author for the requesting identity.
      for (const [kind, table, date] of [
        ["reviews", "reviews", "updated_at"],
        ["entries", "diary_entries", "updated_at"],
        ["lists", "game_lists", "updated_at"],
        ["screenshots", "screenshots", "created_at"],
      ] as const) {
        const shot = kind === "screenshots";
        data[kind] = (
          await client.query(`select c.public_id, ${kind === "lists" ? "null::text" : "c.game_slug"} as game_slug, c.${date} as updated_at, c.${date} as created_at,
 jsonb_build_object('username',p.username,'is_private',p.is_private,'library_visibility',p.library_visibility) as profiles,
 ${kind === "entries" ? "(select jsonb_build_object('public_id',j.public_id,'updated_at',j.updated_at) from public.journeys j where j.id=c.journey_id)" : "null::jsonb"} as journeys
 from public.${table} c join public.profiles p on p.id=c.profile_id
 where c.visibility='PUBLIC' and not exists(select 1 from public.profile_suspension(c.profile_id)) ${shot ? "and c.deleted_at is null and c.sensitive=false" : ""}
 order by c.${date} desc limit 1000`)
        ).rows;
      }
      return { data };
    }),
});
