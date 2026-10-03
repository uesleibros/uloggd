import "server-only";
import type { PoolClient } from "pg";
import { getGamesByIds } from "@/lib/igdb";
import { contentKey } from "@/lib/public-id";
import {
  awardGameIds,
  parseAward,
  AwardValidationError,
  type AwardRecord,
  type AwardCategory,
} from "@/lib/awards";
import { ApiFailure } from "./route";

export function awardKey(request: Request, suffix = false) {
  const parts = new URL(request.url).pathname.split("/");
  const key = contentKey(parts.at(suffix ? -2 : -1) ?? "");
  if (!key) throw new ApiFailure("invalid_request", "Invalid award id.");
  return key;
}

export function awardBody(body: unknown) {
  try {
    return parseAward(body);
  } catch (error) {
    if (error instanceof AwardValidationError)
      throw new ApiFailure(
        "invalid_request",
        "Check the award rules and categories.",
        { field: error.message },
      );
    throw error;
  }
}

export async function checkAwardGames(categories: AwardCategory[]) {
  const ids = awardGameIds(categories);
  if (!ids.length) return;
  const games = await getGamesByIds(ids);
  if (games.length !== ids.length)
    throw new ApiFailure(
      "invalid_request",
      "A nominated game could not be found.",
      { field: "nominees" },
    );
}

export async function readAward(
  client: PoolClient,
  key: readonly [string, string],
  viewer: string | null,
) {
  const { rows } = await client.query<
    AwardRecord & {
      live_categories: AwardCategory[];
      author: Record<string, unknown>;
      source_list: { public_id: string; name: string } | null;
    }
  >(
    `select a.*,public.live_award_categories(a.id) as live_categories,
     json_build_object('username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,'verified',p.verified) as author,
     case when l.id is not null then json_build_object('public_id',l.public_id,'name',l.name) else null end as source_list
     from public.game_awards a join public.profiles p on p.id=a.profile_id
     left join public.game_lists l on l.id=a.source_list_id
     where a.${key[0]}=$1 limit 1`,
    [key[1]],
  );
  const row = rows[0];
  if (!row) throw new ApiFailure("not_found", "No visible award with that id.");
  const { live_categories, author, source_list, ...record } = row;
  const valid = new Set(awardGameIds(live_categories));
  return {
    data: { ...record, categories: live_categories },
    author,
    source_list,
    owned: row.profile_id === viewer,
    invalid_ids:
      row.profile_id === viewer
        ? awardGameIds(row.categories).filter((id) => !valid.has(id))
        : [],
  };
}
