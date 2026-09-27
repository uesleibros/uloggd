import {
  clearing,
  jsonBody,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { MEDIUMS, OWNERSHIPS, STOREFRONTS } from "@/lib/api/enums";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { COPY_COLUMNS } from "@/lib/api/copies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Changes one copy.
 *
 * The collection's POST can do this too, by `id`, and keeps doing it because
 * integrations were told it could. This is the door that matches the rest of
 * the API: the thing being changed is named in the path, and the body is only
 * what changes about it. A field left out stays as it is.
 */
export const PATCH = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "copy id", UUID);
    const body = await jsonBody(request);

    return await db(async (client) => {
      const { rows: existing } = await client.query<{
        igdb_id: number;
        game_slug: string;
        platform_id: number | null;
        platform_name: string | null;
        storefront: string | null;
        ownership: string | null;
        medium: string | null;
        edition: string | null;
        region: string | null;
        note: string | null;
        acquired_on: string | null;
      }>(
        `select ${COPY_COLUMNS} from public.own_library_entries()
          where id = $1`,
        [id],
      );
      const before = existing[0];
      if (!before)
        throw new ApiFailure("not_found", "No copy of yours with that id.");

      // A field the body leaves out stays as it is; a field sent as `null`
      // is being cleared. Without the second half an editor can fill a field
      // in and never empty it again, which is the shape of bug nobody
      // reports and everybody works around.
      const keep = <T>(field: string, next: T | null, current: T) =>
        clearing(body, field) ? (null as T) : next === null ? current : next;
      const { rows } = await client.query(
        `select ${COPY_COLUMNS} from public.save_library_entry(
           game_id => $1, game_slug => $2, entry => $3,
           platform => $4, platform_label => $5,
           entry_storefront => $6, entry_ownership => $7,
           entry_medium => $8, entry_edition => $9, entry_region => $10,
           entry_note => $11, acquired => $12)`,
        [
          before.igdb_id,
          before.game_slug,
          id,
          keep(
            "platform_id",
            optionalInt(body, "platform_id", 1, 2147483647),
            before.platform_id,
          ),
          keep(
            "platform_name",
            optionalText(body, "platform_name", 120),
            before.platform_name,
          ),
          keep(
            "storefront",
            optionalOneOf(body, "storefront", STOREFRONTS),
            before.storefront,
          ),
          keep(
            "ownership",
            optionalOneOf(body, "ownership", OWNERSHIPS),
            before.ownership,
          ),
          keep("medium", optionalOneOf(body, "medium", MEDIUMS), before.medium),
          keep("edition", optionalText(body, "edition", 120), before.edition),
          keep("region", optionalText(body, "region", 60), before.region),
          keep("note", optionalText(body, "note", 300), before.note),
          keep(
            "acquired_on",
            optionalDate(body, "acquired_on"),
            before.acquired_on,
          ),
        ],
      );
      return { data: rows[0] };
    });
  },
});

/**
 * Forgets a copy.
 *
 * A run that was played on it keeps its sessions and loses the platform,
 * which is the honest state: the run happened, the copy is no longer
 * recorded. Deleting the copy is not deleting the playing.
 */
export const DELETE = apiRoute({
  scope: "library.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "copy id", UUID);
    const gone = await db(async (client) => {
      const { rows } = await client.query<{ done: boolean }>(
        "select public.delete_library_entry(entry => $1) as done",
        [id],
      );
      return rows[0]?.done ?? false;
    });
    if (!gone)
      throw new ApiFailure("not_found", "No copy of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
