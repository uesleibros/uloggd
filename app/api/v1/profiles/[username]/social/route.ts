import { ApiFailure, apiRoute } from "@/lib/api/route";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import { PROFILE_TARGET } from "@/lib/api/profile-read";
import type { ProfileSocial } from "@/lib/profile-social-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute({
  public: true,
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) =>
    db(async (client) => {
      // One statement keeps comment hydration from queuing several network round trips.
      const { rows } = await client.query<ProfileSocial["data"]>(
        `with target as (${PROFILE_TARGET}),
      threads as materialized (select threads.* from target,
        lateral public.get_profile_comment_threads(target_profile => target.id, root_limit => 30) threads),
      likes as (select * from public.get_content_likes(target_type => 'profile_comment',target_ids => array(select id from threads)))
      select
        ${identity ? "case when auth.uid() <> target.id then public.is_recent_mutual_follow(target_profile => target.id) else false end" : "false"} as recent_mutual,
        ${
          identity
            ? `coalesce((select to_jsonb(b) from public.get_profile_block_state(target_profile => target.id) b where auth.uid() <> target.id),
          '{"viewer_blocked":false,"blocked_by_target":false}'::jsonb)`
            : `'{"viewer_blocked":false,"blocked_by_target":false}'::jsonb`
        } as block_state,
        coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from (
          select threads.*,coalesce(likes.like_count,0)::int as like_count,coalesce(likes.liked_by_viewer,false) as liked_by_viewer,
            json_build_object('username',author.username,'display_name',author.display_name,'avatar_url',author.avatar_url,'verified',author.verified,'account_type',author.account_type) as author
          from threads join public.profiles author on author.id=threads.author_id
          left join likes on likes.content_id=threads.id where author.username is not null
        ) c),'[]'::jsonb) as comments,
        case when auth.uid() is not null and auth.uid() <> target.id then
          coalesce((select jsonb_agg(w) from public.profile_minerals(target => auth.uid()) w),'[]'::jsonb) else '[]'::jsonb end as viewer_wallet,
        case when target.account_type='ORGANIZATION' then
          coalesce((select jsonb_agg(m) from public.organization_members_of(target => target.id) m),'[]'::jsonb) else '[]'::jsonb end as members
      from target`,
        [segmentBefore(request, 1, "username", HANDLE)],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No account with that name.");
      return { data: rows[0] };
    }),
});
