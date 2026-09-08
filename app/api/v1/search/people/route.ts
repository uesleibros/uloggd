import { apiRoute } from "@/lib/api/route";
import { entitySearch } from "@/lib/api/search-input";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const input = entitySearch(request, ["relevance", "name", "newest"]),
      verified = new URL(request.url).searchParams.get("verified") === "1";
    const query = input.query.replace(/[%_,()]/g, "");
    const order =
      input.sort === "name"
        ? "username asc,id"
        : input.sort === "newest"
          ? "created_at desc,id"
          : "verified desc,created_at desc,id";
    return db(
      async (client) =>
        (
          await client.query(
            `with matching as materialized (
   select id,username,display_name,avatar_url,bio,verified,account_type,created_at from public.profiles
   where username is not null and (not $2::boolean or verified) and ($1::text is null or username ilike $1 or display_name ilike $1)
 ), selected as materialized (select *,exists(select 1 from public.follows where follower_id=$4 and following_id=matching.id) as viewer_follows,
   exists(select 1 from public.follows where following_id=$4 and follower_id=matching.id) as follows_viewer
   from matching order by ${order} limit 24 offset $3)
 select coalesce((select jsonb_agg(to_jsonb(s)-'created_at' order by ${order}) from selected s),'[]'::jsonb) as data,
 (select count(*)::int from matching) as total,
 coalesce((select jsonb_agg(l) from public.profile_levels(targets => array(select id from selected)) l),'[]'::jsonb) as levels,
 ${identity ? "coalesce((select jsonb_agg(s) from public.shared_library_counts(targets => array(select id from selected where id<>$4)) s),'[]'::jsonb)" : "'[]'::jsonb"} as shared`,
            [
              query.length >= 2 ? "%" + query + "%" : null,
              verified,
              (input.page - 1) * 24,
              identity?.profileId ?? null,
            ],
          )
        ).rows[0],
    );
  },
});
