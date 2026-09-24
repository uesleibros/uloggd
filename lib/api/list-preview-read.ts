import "server-only";
import type { PoolClient } from "pg";
import type {
  ListFilters,
  ListPreview,
  ListVisibility,
} from "@/lib/lists-types";
import { getGamesByIds } from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getTierlistPreviews } from "./tierlist-read";
import { series } from "./series";

export type PreviewOptions = ListFilters & {
  limit: number;
  offset: number;
  before?: string;
  query?: string;
  kind?: "COLLECTION" | "TIERLIST";
};
export async function readListPreviews(
  client: PoolClient,
  ownerId: string | null,
  viewerId: string | null,
  options: PreviewOptions,
) {
  const args: unknown[] = [ownerId];
  const where = ["($1::uuid is null or profile_id = $1)"];
  const arg = (v: unknown) => {
    args.push(v);
    return `$${args.length}`;
  };
  if (options.kind)
    where.push(
      options.kind === "TIERLIST"
        ? "kind='TIERLIST'"
        : "(kind is null or kind='COLLECTION')",
    );
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
  // The page, how many match, and the owner's totals, in one round trip. They
  // were three queries in a row, and with the database a round trip away
  // (55ms from Brazil to its region) every listing of lists paid for each.
  const summary = await client.query<{
    rows: {
      id: string;
      public_id: string;
      name: string;
      description: string | null;
      visibility: ListVisibility;
      ranked: boolean | null;
      kind: string | null;
      updated_at: string;
      owner: {
        id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        verified: boolean;
      } | null;
    }[];
    matching: number;
    total: number;
    public: number;
    games: number;
  }>(
    `with filtered as (
        select id,public_id,name,description,visibility,ranked,kind,updated_at,
          ${
            // Whose list it is, for a listing that spans more than one person.
            // A listing of one account's lists says the name once, above them
            // all, and repeating it on every card there would be noise.
            ownerId === null
              ? `(select jsonb_build_object('id',owner.id,'username',owner.username,
                   'display_name',owner.display_name,'avatar_url',owner.avatar_url,
                   'verified',owner.verified)
                  from public.profiles owner where owner.id = game_lists.profile_id)`
              : "null::jsonb"
          } as owner
        from public.game_lists where ${filter}
      ),
      page as (
        select filtered.*, row_number() over (order by ${order},id desc) as position
        from filtered order by ${order},id desc
        limit $${args.length + 1} offset $${args.length + 2}
      )
      select
        coalesce((select jsonb_agg(to_jsonb(page) - 'position' order by position) from page), '[]'::jsonb) as rows,
        (select count(*)::int from filtered) as matching,
        (select count(*)::int from public.game_lists where profile_id=$1) as total,
        (select count(*)::int from public.game_lists where profile_id=$1 and visibility='PUBLIC') as public,
        (select count(*)::int from public.game_list_items item join public.game_lists list on list.id=item.list_id where list.profile_id=$1 ${options.visibility === "PUBLIC" ? "and list.visibility='PUBLIC'" : ""}) as games`,
    [...args, options.limit, options.offset],
  );
  const { rows: lists, ...base } = summary.rows[0];
  if (!lists.length) return { data: [] as ListPreview[], ...base };
  const ids = lists.map((list) => list.id);
  // What the cards need about those lists, in one round trip rather than four.
  const extras = await client.query<{
    previews: { list_id: string; igdb_id: number; item_count: number }[];
    likes: { content_id: string; like_count: number }[];
    comments: { content_id: string; comment_count: number }[];
    custom_cover_scope: string | null;
  }>(
    `select
      coalesce((select jsonb_agg(item) from public.get_list_preview_items(target_lists => $1::uuid[],items_per_list => 5) item), '[]'::jsonb) as previews,
      coalesce((select jsonb_agg(liked) from public.get_content_likes(target_type => 'list',target_ids => $1::uuid[]) liked), '[]'::jsonb) as likes,
      coalesce((select jsonb_agg(counted) from public.get_content_comment_counts(target_type => 'list',target_ids => $1::uuid[]) counted), '[]'::jsonb) as comments,
      (select custom_cover_scope from public.profiles where id = $2) as custom_cover_scope`,
    [ids, viewerId],
  );
  const { custom_cover_scope } = extras.rows[0];
  const previews = { rows: extras.rows[0].previews };
  const likes = { rows: extras.rows[0].likes };
  const comments = { rows: extras.rows[0].comments };
  const preference = { rows: [{ custom_cover_scope }] };
  const gameIds = [...new Set(previews.rows.map((row) => Number(row.igdb_id)))];
  const [games, covers, tiers] = await series(
    () => getGamesByIds(gameIds),
    async () =>
      ownerId === viewerId ||
      preference.rows[0]?.custom_cover_scope === "EVERYONE"
        ? await client.query(
            "select igdb_id,custom_cover_url from public.user_games where profile_id=$1 and igdb_id=any($2::integer[])",
            [ownerId, gameIds],
          )
        : { rows: [] as { igdb_id: number; custom_cover_url: string }[] },
    // Every board on the page in one pass: three queries in all, rather than
    // three for each tierlist, one after another.
    () =>
      getTierlistPreviews(
        client,
        lists.filter((list) => list.kind === "TIERLIST").map((list) => list.id),
      ),
  );
  const byGame = new Map(games.map((game) => [game.id, game]));
  const byCover = new Map(
    covers.rows.map((row) => [row.igdb_id, row.custom_cover_url]),
  );
  const byTier = tiers;
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
      owner: list.owner,
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
