import { apiRoute } from "@/lib/api/route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const params = new URL(request.url).searchParams;
    const page = Math.max(
      1,
      Math.min(1000, Math.trunc(Number(params.get("page")) || 1)),
    );
    const q = (params.get("q") ?? "")
      .trim()
      .slice(0, 100)
      .replace(/[\\%_]/g, (c) => `\\${c}`);
    return db(async (client) => {
      const { rows } = await client.query(
        `select id,public_id,name,count(*) over()::integer as matching from public.game_lists
      where profile_id=$1 and ($2='' or name ilike '%' || $2 || '%' escape '\\')
      order by updated_at desc,id desc limit 48 offset $3`,
        [identity.profileId, q, (page - 1) * 48],
      );
      return {
        data: rows.map((row) => ({
          id: row.id,
          public_id: row.public_id,
          name: row.name,
        })),
        has_more: (rows[0]?.matching ?? 0) > page * 48,
        page,
      };
    });
  },
});
