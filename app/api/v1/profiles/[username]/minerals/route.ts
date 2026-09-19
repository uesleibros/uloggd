import { ApiFailure, apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { PROFILE_TARGET } from "@/lib/api/profile-read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Somebody's wallet: what they hold, their level, and which level paid out
 * which mineral.
 *
 * The grants are here because the wallet page drew that history from
 * `/minerals`, which answers for whoever is asking. On somebody else's wallet a
 * signed-in visitor saw their own level history under the owner's name, and a
 * signed-out one got a 401 and an empty ledger. Grants are public by policy
 * (`using (true)`, the way a level is), so the owner's belong on the owner's
 * page, from the owner's address.
 */
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `with target as (${PROFILE_TARGET}) select
      coalesce((select jsonb_agg(m) from public.profile_minerals(target => target.id) m),'[]'::jsonb) as data,
      (select to_jsonb(l) from public.profile_level(target => target.id) l) as standing,
      coalesce((select jsonb_agg(g order by g.level desc) from (
        select level, mineral, created_at from public.mineral_grants
         where profile_id = target.id) g),'[]'::jsonb) as grants
      from target`,
        [segmentBefore(request, 1, "username", HANDLE)],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No account with that name.");
      return rows[0];
    }),
});
