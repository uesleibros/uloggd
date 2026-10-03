import { apiRoute } from "@/lib/api/route";
import { jsonBody } from "@/lib/api/body";
import { awardBody, checkAwardGames } from "@/lib/api/awards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const params = new URL(request.url).searchParams;
    const mine = params.get("view") === "mine";
    const owner = params.get("username") ?? null;
    const page = Math.max(
      1,
      Math.min(1000, Math.trunc(Number(params.get("page")) || 1)),
    );
    return db(async (client) => {
      const { rows } = await client.query(
        `select a.public_id,a.name,a.year,a.mode,a.visibility,a.status,a.updated_at,
       jsonb_array_length(a.categories) as category_count,
       (select count(*)::integer from jsonb_array_elements(public.live_award_categories(a.id)) c where c->'winner'<>'null'::jsonb) as winner_count,
       json_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'verified',p.verified) as author,
       count(*) over()::integer as matching
       from public.game_awards a join public.profiles p on p.id=a.profile_id
       where ($1::boolean=false or a.profile_id=$2::uuid) and ($3::text is null or p.username=$3)
       and ($1::boolean=true or a.status='PUBLISHED')
       order by a.updated_at desc,a.id desc limit 24 offset $4`,
        [mine, identity?.profileId ?? null, owner, (page - 1) * 24],
      );
      return {
        data: rows.map((row) => {
          const copy = { ...row };
          delete copy.matching;
          return copy;
        }),
        has_more: (rows[0]?.matching ?? 0) > page * 24,
        page,
      };
    });
  },
});

export const POST = apiRoute({
  scope: "lists.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, identity, db }) => {
    const doc = awardBody(await jsonBody(request));
    await checkAwardGames(doc.categories);
    return db(async (client) => {
      const { rows } = await client.query(
        `insert into public.game_awards (profile_id,name,year,mode,rules,source,source_list_id,visibility,status,categories)
       values ($1,$2,$3,$4,$5,$6,$7,$8::public."Visibility",$9,$10::jsonb) returning *`,
        [
          identity.profileId,
          doc.name,
          doc.year,
          doc.mode,
          doc.rules,
          doc.source,
          doc.source_list_id,
          doc.visibility,
          doc.status,
          JSON.stringify(doc.categories),
        ],
      );
      return { data: rows[0] };
    });
  },
});
