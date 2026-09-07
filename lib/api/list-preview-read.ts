import "server-only";
import type { PoolClient } from "pg";
import type { ListFilters, ListPreview } from "@/lib/lists-types";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getTierlistPreview } from "./tierlist-read";

export type PreviewOptions = ListFilters & {
  limit: number;
  offset: number;
  before?: string;
  query?: string;
};
export async function readListPreviews(
  client: PoolClient,
  ownerId: string,
  viewerId: string | null,
  options: PreviewOptions,
) {
  const args: unknown[] = [ownerId];
  const where = ["profile_id = $1"];
  const arg = (v: unknown) => {
    args.push(v);
    return `$${args.length}`;
  };
  if (options.visibility && options.visibility !== "ALL")
    where.push(`visibility = ${arg(options.visibility)}`);
  if (options.mode && options.mode !== "ALL")
    where.push(`ranked = ${arg(options.mode === "RANKED")}`);
  if (options.query)
    where.push(
      `name ilike ${arg(`%${options.query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)}`,
    );
  if (options.before)
    where.push(`updated_at < ${arg(options.before)}::timestamptz`);
  const filter = where.join(" and ");
  const order =
    options.sort === "name"
      ? "name asc"
      : `updated_at ${options.sort === "oldest" ? "asc" : "desc"}`;
  const [selected, count, stats] = await Promise.all([
    client.query(
      `select id,public_id,name,description,visibility,ranked,kind,updated_at from public.game_lists where ${filter}
      order by ${order},id desc limit $${args.length + 1} offset $${args.length + 2}`,
      [...args, options.limit, options.offset],
    ),
    client.query<{ count: number }>(
      `select count(*)::int as count from public.game_lists where ${filter}`,
      args,
    ),
    client.query<{ total: number; public: number; games: number }>(
      `select
      (select count(*)::int from public.game_lists where profile_id=$1) as total,
      (select count(*)::int from public.game_lists where profile_id=$1 and visibility='PUBLIC') as public,
      (select count(*)::int from public.game_list_items item join public.game_lists list on list.id=item.list_id where list.profile_id=$1 ${options.visibility === "PUBLIC" ? "and list.visibility='PUBLIC'" : ""}) as games`,
      [ownerId],
    ),
  ]);
  const lists = selected.rows;
  const base = { matching: count.rows[0].count, ...stats.rows[0] };
  if (!lists.length) return { data: [] as ListPreview[], ...base };
  const ids = lists.map((list) => list.id);
  const [previews, likes, comments, preference] = await Promise.all([
    client.query(
      "select * from public.get_list_preview_items(target_lists => $1::uuid[],items_per_list => 5)",
      [ids],
    ),
    client.query(
      "select * from public.get_content_likes(target_type => 'list',target_ids => $1::uuid[])",
      [ids],
    ),
    client.query(
      "select * from public.get_content_comment_counts(target_type => 'list',target_ids => $1::uuid[])",
      [ids],
    ),
    client.query(
      "select custom_cover_scope from public.profiles where id = $1",
      [viewerId],
    ),
  ]);
  const gameIds = [...new Set(previews.rows.map((row) => Number(row.igdb_id)))];
  const [games, covers, tiers] = await Promise.all([
    getGamesByIds(gameIds),
    ownerId === viewerId ||
    preference.rows[0]?.custom_cover_scope === "EVERYONE"
      ? client.query(
          "select igdb_id,custom_cover_url from public.user_games where profile_id=$1 and igdb_id=any($2::integer[])",
          [ownerId, gameIds],
        )
      : { rows: [] },
    Promise.all(
      lists
        .filter((list) => list.kind === "TIERLIST")
        .map(
          async (list) =>
            [list.id, await getTierlistPreview(client, list.id)] as const,
        ),
    ),
  ]);
  const byGame = new Map(games.map((game) => [game.id, game]));
  const byCover = new Map(
    covers.rows.map((row) => [row.igdb_id, row.custom_cover_url]),
  );
  const byTier = new Map(tiers);
  const byLike = new Map(
    likes.rows.map((row) => [row.content_id, Number(row.like_count)]),
  );
  const byComment = new Map(
    comments.rows.map((row) => [row.content_id, Number(row.comment_count)]),
  );
  const data: ListPreview[] = lists.map((list) => {
    const items = previews.rows.filter((row) => row.list_id === list.id);
    const tier = byTier.get(list.id);
    return {
      id: list.id,
      publicId: list.public_id,
      name: list.name,
      description: list.description,
      visibility: list.visibility,
      ranked: Boolean(list.ranked),
      kind: list.kind === "TIERLIST" ? "TIERLIST" : "COLLECTION",
      count: tier?.count ?? Number(items[0]?.item_count ?? 0),
      tierRows: tier?.rows,
      covers: tier
        ? []
        : items.flatMap((item) => {
            const game = byGame.get(item.igdb_id);
            return game
              ? [
                  {
                    url: resolveGameCover(game.coverUrl, byCover.get(game.id)),
                    fallbackUrl: game.coverUrl,
                    name: game.name,
                  },
                ]
              : [];
          }),
      likes: byLike.get(list.id) ?? 0,
      comments: byComment.get(list.id) ?? 0,
      updatedAt: new Date(list.updated_at).toISOString(),
    };
  });
  if (options.sort === "size") data.sort((a, b) => b.count - a.count);
  if (options.sort === "likes") data.sort((a, b) => b.likes - a.likes);
  return { data, ...base };
}
