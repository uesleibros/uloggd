import "server-only";
import type { PoolClient } from "pg";
import type { ContentContext, ContentRecord } from "@/lib/content-types";
import { ApiFailure } from "./route";
import { contentKey } from "@/lib/public-id";

const SELECTS = {
  review: {
    table: "reviews",
    columns:
      "rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,comments_scope,journey_id",
  },
  diary: {
    table: "diary_entries",
    columns:
      "played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,journey_id",
  },
  screenshot: {
    table: "screenshots",
    columns:
      "image_url,description,contains_spoilers,sensitive,visibility,comments_scope,width,height,deleted_at",
  },
  journey: { table: "journeys", columns: "title" },
} as const;

export async function readContent<
  T extends Pick<ContentRecord, "id" | "profile_id">,
>(client: PoolClient, kind: keyof typeof SELECTS, id: string) {
  const key = contentKey(id);
  if (!key)
    throw new ApiFailure("invalid_request", "That is not a content id.");
  const source = SELECTS[kind];
  const journey = kind === "review" || kind === "diary";
  const result = await client.query<T>(
    `select item.id,item.public_id,item.profile_id,item.igdb_id,item.game_slug,item.created_at,item.updated_at,
    ${source.columns
      .split(",")
      .map((column) => `item.${column}`)
      .join(",")},
    json_build_object('username',author.username,'display_name',author.display_name,'avatar_url',author.avatar_url,'verified',author.verified,'account_type',author.account_type,'content_comment_scope',author.content_comment_scope) as profiles
    ${journey ? ",json_build_object('title',journey.title,'public_id',journey.public_id) as journeys" : ""}
    from public.${source.table} item join public.profiles author on author.id=item.profile_id
    ${journey ? "left join public.journeys journey on journey.id=item.journey_id" : ""}
    where item.${key[0]}=$1 ${kind === "screenshot" ? "and item.deleted_at is null" : ""} limit 1`,
    [key[1]],
  );
  if (!result.rows[0])
    throw new ApiFailure("not_found", "No visible content with that id.");
  return result.rows[0];
}

export async function readContentContext(
  client: PoolClient,
  viewer: string | null,
  kind: "review" | "diary" | "screenshot" | "list",
  record: { id: string; profile_id: string; igdb_id?: number },
): Promise<ContentContext> {
  const { rows } = await client.query<ContentContext>(
    `select
    (select to_jsonb(l) from public.profile_level(target => $1) l) as standing,
    coalesce((select jsonb_build_object('like_count',like_count::int,'liked_by_viewer',liked_by_viewer)
      from public.get_content_likes(target_type => $2,target_ids => $3::uuid[])),
      '{"like_count":0,"liked_by_viewer":false}'::jsonb) as like,
    exists(select 1 from public.follows where follower_id=$4 and following_id=$1) as viewer_follows,
    (select custom_cover_scope from public.profiles where id=$4) as custom_cover_scope,
    coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'custom_cover_url',custom_cover_url))
      from public.user_games where $4::uuid is not null and profile_id=any(array[$1::uuid,$4::uuid]) and igdb_id=$5),'[]'::jsonb) as covers`,
    [record.profile_id, kind, [record.id], viewer, record.igdb_id ?? null],
  );
  return rows[0];
}
