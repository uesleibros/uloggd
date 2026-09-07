import "server-only";
import type { PoolClient } from "pg";
import type { ActivityOptions } from "@/lib/activity-types";
import type { ProfileJoin } from "@/lib/profile-join";

export type ActivityRow = {
  id: string;
  public_id: string;
  profile_id: string;
  igdb_id: number;
  game_slug: string;
  created_at: string;
  profiles: ProfileJoin | null;
} & Record<string, unknown>;

const SOURCES = {
  review: {
    table: "reviews",
    columns:
      "rating,rating_mode,recommended,title,aspect_ratings,mastered,replay,platform,started_on,finished_on,content,contains_spoilers,visibility,comments_scope,updated_at,journey_id",
    search: ["title", "content", "platform"],
  },
  diary: {
    table: "diary_entries",
    columns:
      "played_on,ended_on,started_at,minutes,note,marks_start,marks_finish,contains_spoilers,sensitive,visibility,comments_scope,updated_at,journey_id",
    search: ["note"],
  },
  screenshot: {
    table: "screenshots",
    columns:
      "image_url,description,contains_spoilers,sensitive,visibility,comments_scope,width,height,updated_at",
    search: ["description"],
  },
} as const;

export async function activityRows(
  client: PoolClient,
  kind: keyof typeof SOURCES,
  options: ActivityOptions,
) {
  const source = SOURCES[kind];
  const values: unknown[] = [];
  const arg = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  const where: string[] = [];
  if (options.profileId)
    where.push(`item.profile_id = ${arg(options.profileId)}::uuid`);
  if (options.profileIds)
    where.push(`item.profile_id = any(${arg(options.profileIds)}::uuid[])`);
  if (options.gameId) where.push(`item.igdb_id = ${arg(options.gameId)}`);
  if (options.before)
    where.push(
      `item.created_at ${options.order === "oldest" ? ">" : "<"} ${arg(options.before)}::timestamptz`,
    );
  if (options.spoilers && options.spoilers !== "all")
    where.push(`item.contains_spoilers = ${arg(options.spoilers === "only")}`);
  const pattern = options.search
    ?.trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 12)
    .join("%");
  if (pattern) {
    const parameter = arg(`%${pattern}%`);
    const clauses = ["game_slug", ...source.search].map(
      (column) => `item.${column} ilike ${parameter}`,
    );
    if (kind !== "screenshot") clauses.push(`journey.title ilike ${parameter}`);
    where.push(`(${clauses.join(" or ")})`);
  }
  if (kind === "review" && options.rating) {
    const ratings = {
      rated: "is not null",
      unrated: "is null",
      great: ">= 80",
      positive: ">= 60 and item.rating < 80",
      mixed: ">= 40 and item.rating < 60",
      low: "< 40",
    };
    where.push(`item.rating ${ratings[options.rating]}`);
  }
  const order =
    kind === "review" && options.order === "rating"
      ? "item.rating desc nulls last, item.created_at desc"
      : `item.created_at ${options.order === "oldest" ? "asc" : "desc"}`;
  // Identifiers come from this module's resource list; all input is parameterized.
  const result = await client.query<ActivityRow>(
    `select item.id,item.public_id,item.profile_id,item.igdb_id,item.game_slug,
       to_char(item.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at,
       ${source.columns
         .split(",")
         .map((column) => `item.${column}`)
         .join(",")},
       json_build_object('username',person.username,'display_name',person.display_name,
         'avatar_url',person.avatar_url,'verified',person.verified,'account_type',person.account_type) as profiles
       ${kind !== "screenshot" ? ", json_build_object('title',journey.title,'public_id',journey.public_id) as journeys" : ""}
      from public.${source.table} item
      join public.profiles person on person.id = item.profile_id
      ${kind !== "screenshot" ? "left join public.journeys journey on journey.id = item.journey_id" : ""}
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by ${order}, item.id desc
      limit ${arg(options.limit ?? 30)} offset ${arg(options.offset ?? 0)}`,
    values,
  );
  return result.rows;
}
