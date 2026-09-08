import "server-only";
import {
  pageMeta,
  PAGE_SIZE,
  requestedPage,
  countedLimit,
  withoutCount,
} from "./paging";
import { ApiFailure, apiRoute } from "./route";

/**
 * A page of rows the key's owner owns.
 *
 * `table`, `columns` and `order` are written here, never taken from the
 * request, which is what keeps them out of reach of anything a caller sends.
 * Row level security still decides what comes back; the profile_id clause is
 * there to use the index, not to be the check.
 */
export function ownedCollection(options: {
  scope: string;
  table: string;
  columns: string;
  order: string;
  also?: string;
  game?: boolean;
}) {
  return apiRoute({
    scope: options.scope,
    bucket: "read",
    handle: async ({ request, identity, db }) => {
      const page = requestedPage(request);
      const size = options.game
        ? countedLimit(request, PAGE_SIZE, 1000)
        : PAGE_SIZE;
      const asked = options.game
        ? new URL(request.url).searchParams.get("game")
        : null;
      const game = asked === null ? null : Number(asked);
      if (
        game !== null &&
        (!Number.isSafeInteger(game) || game < 1 || game > 2147483647)
      )
        throw new ApiFailure(
          "invalid_request",
          "game must be a positive catalog id.",
        );
      const rows = await db(async (client) => {
        const result = await client.query(
          `select ${options.columns}, count(*) over() as total_count
             from public.${options.table}
            where profile_id = $1${options.also ? ` and ${options.also}` : ""}${options.game ? " and ($4::integer is null or igdb_id=$4)" : ""}
            order by ${options.order}
            limit $2 offset $3`,
          [
            identity.profileId,
            size,
            (page - 1) * size,
            ...(options.game ? [game] : []),
          ],
        );
        return result.rows as Record<string, unknown>[];
      });

      return { data: withoutCount(rows), page: pageMeta(page, rows, size) };
    },
  });
}
