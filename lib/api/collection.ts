import "server-only";
import {
  offsetFor,
  pageMeta,
  PAGE_SIZE,
  requestedPage,
  withoutCount,
} from "./paging";
import { apiRoute } from "./route";

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
}) {
  return apiRoute({
    scope: options.scope,
    bucket: "read",
    handle: async ({ request, identity, db }) => {
      const page = requestedPage(request);
      const rows = await db(async (client) => {
        const result = await client.query(
          `select ${options.columns}, count(*) over() as total_count
             from public.${options.table}
            where profile_id = $1${options.also ? ` and ${options.also}` : ""}
            order by ${options.order}
            limit $2 offset $3`,
          [identity.profileId, PAGE_SIZE, offsetFor(page)],
        );
        return result.rows as Record<string, unknown>[];
      });

      return { data: withoutCount(rows), page: pageMeta(page, rows) };
    },
  });
}
