import { readContentContext } from "@/lib/api/content-read";
import type { ListRecord } from "@/lib/content-types";
import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { VISIBILITIES } from "@/lib/api/enums";
import { applyCommentsScope } from "@/lib/api/comments";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");

    return await db(async (client) => {
      const { rows: lists } = await client.query<ListRecord>(
        `select l.id,l.public_id,l.profile_id,l.name,l.description,l.visibility,l.ranked,l.kind,l.comments_scope,l.created_at,l.updated_at,
          json_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'verified',p.verified,'content_comment_scope',p.content_comment_scope) as profiles
          from public.game_lists l join public.profiles p on p.id=l.profile_id where l.id::text=$1 or l.public_id=$1 limit 1`,
        [id],
      );
      const list = lists[0];
      if (!list) throw new ApiFailure("not_found", "No list with that id.");

      const { rows: items } = await client.query(
        `select id, igdb_id, game_slug, position, note, created_at
           from public.game_list_items
          where list_id = $1
          order by position asc, id asc
          `,
        [list.id],
      );

      const owned = list.profile_id === identity?.profileId;
      const context = await readContentContext(
        client,
        identity?.profileId ?? null,
        "list",
        list,
      );
      const { rows: extra } = await client.query(
        `select
        case when $4='TIERLIST' then array(select public.tierlist_live_ids(target_list => $1)) else array[]::integer[] end as live_ids,
        coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'igdb_id',igdb_id,'custom_cover_url',custom_cover_url))
          from public.user_games where $3::uuid is not null and profile_id=any(array[$2::uuid,$3::uuid]) and igdb_id=any($5::integer[])),'[]'::jsonb) as covers,
        coalesce((select jsonb_agg(jsonb_build_object('igdb_id',igdb_id,'status',status,'playing',playing,'backlog',backlog,'wishlist',wishlist,'liked',liked,'quick_rating',quick_rating,'custom_cover_url',custom_cover_url))
          from public.user_games where profile_id=$3 and igdb_id=any($5::integer[])),'[]'::jsonb) as viewer_states`,
        [
          list.id,
          list.profile_id,
          identity?.profileId ?? null,
          list.kind,
          items.map((item) => item.igdb_id),
        ],
      );
      return {
        data: { ...list, owned, items },
        context: { ...context, covers: extra[0].covers },
        live_ids: extra[0].live_ids,
        viewer_states: extra[0].viewer_states,
      };
    });
  },
});

export const PATCH = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");
    const body = await jsonBody(request);

    return await db(async (client) => {
      const { rows: lists } = await client.query(
        `select id, name, description, visibility, ranked
           from public.game_lists
          where id::text = $1 or public_id = $1
          limit 1`,
        [id],
      );
      const before = lists[0];
      if (!before)
        throw new ApiFailure("not_found", "No list of yours with that id.");
      const keep = <T>(next: T | null, current: T) =>
        next === null ? current : next;

      await applyCommentsScope(client, "list", before.id, body);

      await client.query(
        `select public.update_game_list(
           target_list => $1, list_name => $2, list_description => $3,
           list_visibility => $4::public."Visibility", list_ranked => $5)`,
        [
          before.id,
          keep(optionalText(body, "name", 120), before.name),
          keep(optionalText(body, "description", 1000), before.description),
          keep(
            optionalOneOf(body, "visibility", VISIBILITIES),
            before.visibility,
          ),
          keep(optionalBool(body, "ranked"), before.ranked),
        ],
      );

      const { rows } = await client.query(
        `select id, public_id, name, description, visibility, ranked, kind,
                comments_scope, updated_at
           from public.game_lists where id = $1`,
        [before.id],
      );
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = decodeURIComponent(
      new URL(request.url).pathname.split("/").pop() ?? "",
    );
    if (!/^[0-9a-zA-Z_-]{1,64}$/.test(id))
      throw new ApiFailure("invalid_request", "That is not a list id.");

    const removed = await db(async (client) => {
      const { rowCount } = await client.query(
        "delete from public.game_lists where id::text = $1 or public_id = $1",
        [id],
      );
      return rowCount ?? 0;
    });
    if (removed === 0)
      throw new ApiFailure("not_found", "No list of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
