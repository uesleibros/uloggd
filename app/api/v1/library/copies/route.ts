import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  optionalUuid,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { MEDIUMS, OWNERSHIPS, STOREFRONTS } from "@/lib/api/enums";
import { apiRoute } from "@/lib/api/route";
import { series } from "@/lib/api/series";
import { matchingCopy, type Copy } from "@/lib/library-copies";
import { COPY_COLUMNS } from "@/lib/api/copies";
import {
  COPY_SORTS,
  COPY_TOTALS_SQL,
  copyCursorClause,
  copyOrderBy,
  copySearchTerm,
  copySortKey,
  decodeCopyCursor,
  encodeCopyCursor,
  type CopySort,
} from "@/lib/copy-browsing";
import { getGamesByIds } from "@/lib/igdb";
import { publicGame } from "@/lib/api/shapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

type Filters = {
  platform: number | null;
  medium: string | null;
  ownership: string | null;
  storefront: string | null;
  search: string | null;
};

/**
 * The `where` for one set of filters, as SQL and its values.
 *
 * `skip` leaves one filter out, which is what a facet needs: the platform
 * counts have to be counted with the medium and the storefront applied and
 * the platform ignored, or picking a platform would leave every other
 * platform reading zero and there would be no way back.
 */
function conditions(
  profileId: string,
  filters: Filters,
  skip?: keyof Filters,
): { sql: string; values: unknown[] } {
  const values: unknown[] = [profileId];
  const parts = ["profile_id = $1"];
  const add = (fragment: (placeholder: string) => string, value: unknown) => {
    values.push(value);
    parts.push(fragment(`$${values.length}`));
  };
  if (filters.platform !== null && skip !== "platform")
    add((at) => `platform_id = ${at}::integer`, filters.platform);
  if (filters.medium && skip !== "medium")
    add((at) => `medium = ${at}`, filters.medium);
  if (filters.ownership && skip !== "ownership")
    add((at) => `ownership = ${at}`, filters.ownership);
  if (filters.storefront && skip !== "storefront")
    add((at) => `storefront = ${at}`, filters.storefront);
  if (filters.search && skip !== "search")
    // The slug is the title, and the edition and the platform are the other
    // two things somebody types. Nothing here reaches the catalogue: a search
    // that asked IGDB about every row would be the N+1 this view exists
    // without.
    add(
      (at) =>
        `(game_slug ilike '%' || ${at} || '%'
          or lower(coalesce(edition, '')) like '%' || replace(${at}, '-', ' ') || '%'
          or lower(coalesce(platform_name, '')) like '%' || replace(${at}, '-', ' ') || '%')`,
      filters.search,
    );
  return { sql: parts.join(" and "), values };
}

/**
 * The copies somebody has, a page at a time.
 *
 * Separate from the library, which says where a game stands with you, and
 * from a run, which says what happened when you played it. One game can have
 * three copies and two runs, and a run points at the copy it was played on.
 *
 * Their own only. Somebody else's copies are read through the journey they
 * belong to, by the rule their library visibility sets.
 *
 * `?game=` keeps answering the way it always did, unpaged and in the order it
 * was recorded, because the game page and the run editor ask that question
 * about a handful of rows and neither wants a cursor.
 */
export const GET = apiRoute({
  scope: "library.read",
  bucket: "read",
  handle: ({ request, identity, db }) => {
    const query = new URL(request.url).searchParams;
    const asked = query.get("game");
    const game = asked === null ? null : Number(asked);
    const forOneGame = Number.isSafeInteger(game) && game! > 0;
    // `games=1` brings the catalogue rows along, for anything drawing copies
    // of more than one game: a view that asked per copy would be one request
    // per row of a shelf.
    const withGames = query.get("games") === "1";

    if (forOneGame)
      return db(async (client) => {
        const { rows } = await client.query<{ igdb_id: number }>(
          `select ${COPY_COLUMNS} from public.own_library_entries(game_id => $1)`,
          [game],
        );
        if (!withGames) return { data: rows };
        const games = await getGamesByIds(rows.map((row) => row.igdb_id));
        return { data: rows, games: games.map(publicGame) };
      });

    const limit = Math.min(
      Math.max(Number(query.get("limit")) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const sort = (COPY_SORTS as readonly string[]).includes(
      query.get("sort") ?? "",
    )
      ? (query.get("sort") as CopySort)
      : "newest";
    const platform = Number(query.get("platform"));
    const filters: Filters = {
      platform:
        Number.isSafeInteger(platform) && platform > 0 ? platform : null,
      // Whitelisted against the same lists the writes use, so a filter is
      // never a value somebody chose.
      medium: (MEDIUMS as readonly string[]).includes(query.get("medium") ?? "")
        ? query.get("medium")
        : null,
      ownership: (OWNERSHIPS as readonly string[]).includes(
        query.get("ownership") ?? "",
      )
        ? query.get("ownership")
        : null,
      storefront: (STOREFRONTS as readonly string[]).includes(
        query.get("storefront") ?? "",
      )
        ? query.get("storefront")
        : null,
      search: copySearchTerm(query.get("q") ?? ""),
    };
    const cursor = decodeCopyCursor(query.get("cursor"));
    const withFacets = query.get("facets") === "1";

    return db(async (client) => {
      const page = conditions(identity.profileId, filters);
      const values = [...page.values];
      let where = page.sql;
      if (cursor) {
        values.push(cursor.key, cursor.id);
        where += ` and ${copyCursorClause(
          sort,
          `$${values.length - 1}`,
          `$${values.length}`,
        )}`;
      }

      // One row more than asked for: whether there is another page is a fact
      // about the rows, not a second count over the whole shelf.
      //
      // The sort key comes back a second time as text, and that is not
      // redundant: the driver hands a `timestamptz` over as a JavaScript Date,
      // which keeps milliseconds and drops the microseconds the column
      // actually holds. Sending that truncated instant back as the cursor
      // asks for rows older than a moment that is fractionally *before* every
      // row, so the second page comes back empty and the shelf looks like it
      // ends at twenty-four. Postgres casting its own value to text loses
      // nothing.
      const keyColumn = copySortKey(sort);
      const { rows } = await client.query<Copy & { cursor_key: string | null }>(
        `select ${COPY_COLUMNS}, ${keyColumn}::text as cursor_key
           from public.library_entries
          where ${where}
          order by ${copyOrderBy(sort)}
          limit ${limit + 1}`,
        values,
      );
      const rest = rows.length > limit;
      const page_rows = rest ? rows.slice(0, limit) : rows;
      const last = page_rows[page_rows.length - 1];
      const nextCursor =
        rest && last
          ? encodeCopyCursor({ key: last.cursor_key ?? null, id: last.id })
          : null;
      // The cursor column is the route's bookkeeping, not part of a copy.
      const data = page_rows.map((row) => {
        const copy: Partial<typeof row> = { ...row };
        delete copy.cursor_key;
        return copy as Copy;
      });

      const answer: Record<string, unknown> = {
        data,
        page: { size: limit, has_more: rest },
        next_cursor: nextCursor,
      };

      if (withGames) {
        // Deduplicated: a page of twenty-four copies of fourteen games is
        // fourteen catalogue rows, not twenty-four.
        const games = await getGamesByIds(data.map((row) => row.igdb_id));
        answer.games = games.map(publicGame);
      }

      if (withFacets) {
        const facet = (field: keyof Filters, column: string) => {
          const scoped = conditions(identity.profileId, filters, field);
          return () =>
            client.query<{ value: string; copies: string }>(
              `select ${column} as value, count(*)::int as copies
                 from public.library_entries
                where ${scoped.sql} and ${column} is not null
                group by 1 order by copies desc, value asc limit 40`,
              scoped.values,
            );
        };
        const [
          { rows: platforms },
          { rows: mediums },
          { rows: ownerships },
          { rows: storefronts },
          { rows: totals },
        ] = await series(
          facet("platform", "platform_name"),
          facet("medium", "medium"),
          facet("ownership", "ownership"),
          facet("storefront", "storefront"),
          () =>
            client.query<{
              copies: number;
              games: number;
            }>(
              `select count(*)::int as copies,
                      count(distinct igdb_id)::int as games
                 from public.library_entries where ${page.sql}`,
              page.values,
            ),
        );
        // Two questions that look like one, counted over the whole shelf
        // rather than over this page: how many games somebody has twice, and
        // how many they have on two platforms. A person with two identical
        // PS5 discs has the first and not the second.
        //
        // Counted in the database rather than by reading every row and adding
        // them up here, which is the thing this view exists to stop doing:
        // the answer is three integers however large the shelf is.
        const { rows: shelf } = await client.query<{
          games: number;
          games_with_multiple_copies: number;
          games_on_multiple_platforms: number;
        }>(COPY_TOTALS_SQL, [identity.profileId]);
        answer.facets = {
          platform: platforms,
          medium: mediums,
          ownership: ownerships,
          storefront: storefronts,
        };
        answer.totals = { ...totals[0], ...shelf[0] };
      }

      return answer;
    });
  },
});

/**
 * Records a copy, or finds the one already recorded.
 *
 * Every field but the game is optional: "I played it on PS5" is a row with a
 * platform and everything else null, which is what keeps this from being a
 * form.
 *
 * It is an upsert rather than a create, because the common caller is somebody
 * saying how they played rather than cataloguing a shelf. Asking for "PS5"
 * when a PS5 copy is already recorded means that copy; answering with a new
 * row every time is how a library ends up with nine identical PlayStation 5
 * entries nobody asked for. `created` in the answer says which happened.
 *
 * Two escapes, because people do own two physical copies of one game:
 * `duplicate: true` always makes another, and `id` edits the one named.
 */
export const POST = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const gameId = requireInt(body, "igdb_id");
    const slug = requireSlug(body, "game_slug");
    const id = optionalUuid(body, "id");
    const draft = {
      platform_id: optionalInt(body, "platform_id", 1, 2147483647),
      platform_name: optionalText(body, "platform_name", 120),
      storefront: optionalOneOf(body, "storefront", STOREFRONTS),
      ownership: optionalOneOf(body, "ownership", OWNERSHIPS),
      medium: optionalOneOf(body, "medium", MEDIUMS),
      edition: optionalText(body, "edition", 120),
      region: optionalText(body, "region", 60),
    };
    const note = optionalText(body, "note", 300);
    const acquired = optionalDate(body, "acquired_on");
    const duplicate = optionalBool(body, "duplicate") ?? false;

    return await db(async (client) => {
      if (!id && !duplicate) {
        const { rows: mine } = await client.query<Copy>(
          `select ${COPY_COLUMNS} from public.own_library_entries(game_id => $1)`,
          [gameId],
        );
        const already = matchingCopy(mine, draft);
        if (already) return { data: already, created: false };
      }

      const { rows } = await client.query(
        `select ${COPY_COLUMNS} from public.save_library_entry(
           game_id => $1, game_slug => $2, entry => $3,
           platform => $4, platform_label => $5,
           entry_storefront => $6, entry_ownership => $7,
           entry_medium => $8, entry_edition => $9, entry_region => $10,
           entry_note => $11, acquired => $12)`,
        [
          gameId,
          slug,
          id,
          draft.platform_id,
          draft.platform_name,
          draft.storefront,
          draft.ownership,
          draft.medium,
          draft.edition,
          draft.region,
          note,
          acquired,
        ],
      );
      return { data: rows[0], created: !id };
    });
  },
});
