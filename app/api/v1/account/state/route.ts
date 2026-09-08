import { apiRoute } from "@/lib/api/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ identity, db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `select
  exists(select 1 from public.profile_suspension(target => $1)) as suspended,
  (select jsonb_build_object('banned_at',banned_at,'banned_until',banned_until,'reason',reason) from public.profile_moderation_state where profile_id=$1) as state,
  (select count(*)::int from public.profile_infractions where profile_id=$1) as infractions`,
        [identity.profileId],
      );
      return { data: rows[0] };
    }),
});
