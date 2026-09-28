import { readContentContext } from "@/lib/api/content-read";
import type { ListRecord } from "@/lib/content-types";
import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
  optionalUuidList,
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
          coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'public_id',f.public_id,'name',f.name) order by f.position asc, f.created_at asc)
             from public.list_folder_items i
             join public.list_folders f on f.id = i.folder_id
            where i.list_id = l.id), '[]'::jsonb) as folders,
          json_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'verified',p.verified,'content_comment_scope',p.content_comment_scope) as profiles
          from public.game_lists l join public.profiles p on p.id=l.profile_id where l.id::text=$1 or l.public_id=$1 limit 1`,
        [id],
      );
      const list = lists[0];
      if (!list) throw new ApiFailure("not_found", "No list with that id.");

      const { rows: items } = await client.query(
        `select id, igdb_id, game_slug, position, note, mark_mode, mark_color,
                created_at
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

      // Filing, which is not editing: a folder is a heading the owner put
      // over some of their lists, and it carries no visibility of its own. A
      // list can be under several, because "Zelda" and "2026" are both true
      // of the same one.
      //
      // The whole set arrives at once and replaces what was there, which is
      // what a row of checkboxes means. The database refuses a folder that is
      // not the caller's, so nothing here repeats that check: repeating it is
      // how the two drift apart.
      const folders = optionalUuidList(body, "folder_ids", 40);
      if (folders) {
        await client.query(
          `delete from public.list_folder_items
            where list_id = $1 and not (folder_id = any($2::uuid[]))`,
          [before.id, folders],
        );
        if (folders.length)
          await client.query(
            `insert into public.list_folder_items (folder_id, list_id)
             select unnest($2::uuid[]), $1
             on conflict do nothing`,
            [before.id, folders],
          );
      }

      const { rows } = await client.query(
        `select l.id, l.public_id, l.name, l.description, l.visibility,
                l.ranked, l.kind, l.comments_scope, l.updated_at,
                coalesce((select jsonb_agg(jsonb_build_object(
                    'id', f.id, 'public_id', f.public_id, 'name', f.name)
                    order by f.position asc, f.created_at asc)
                   from public.list_folder_items i
                   join public.list_folders f on f.id = i.folder_id
                  where i.list_id = l.id), '[]'::jsonb) as folders
           from public.game_lists l where l.id = $1`,
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
