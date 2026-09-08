import { apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, db }) =>
    db(async (client) => {
      const { rows } = await client.query(
        `with account as (select * from public.company_official_account(company_slug => $1) limit 1)
 select (select to_jsonb(a) from account a) as data,
 (select to_jsonb(l) from account a,lateral public.profile_level(target => a.id) l) as standing`,
        [segmentBefore(request, 1, "company slug", HANDLE)],
      );
      return rows[0];
    }),
});
