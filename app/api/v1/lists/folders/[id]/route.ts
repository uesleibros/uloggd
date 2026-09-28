import { jsonBody, optionalInt, optionalText } from "@/lib/api/body";
import { lastSegment } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

/** A uuid or the short id a link carries. */
const FOLDER_ID = /^[0-9a-zA-Z-]{8,64}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Renames a folder, or moves it in the owner's own order. */
export const PATCH = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    // Either id: the short one is what a link carries, and the uuid is what
    // the rest of the schema points at.
    const id = lastSegment(request, "folder id", FOLDER_ID);
    const body = await jsonBody(request);
    const name = optionalText(body, "name", 60);
    const position = optionalInt(body, "position", 0, 999);
    if (name === null && position === null)
      throw new ApiFailure("invalid_request", "Nothing to change.");
    if (name !== null && !name.trim())
      throw new ApiFailure("invalid_request", "name cannot be empty.");

    return await db(async (client) => {
      // The owner's rows only, through row-level security rather than a check
      // written here: somebody else's folder is not found rather than refused.
      const { rows } = await client.query(
        `update public.list_folders
            set name = coalesce($2, name), position = coalesce($3, position)
          where id::text = $1 or public_id = $1
          returning id, public_id, name, position, created_at`,
        [id, name?.trim() ?? null, position],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No folder with that id.");
      return { data: rows[0] };
    });
  },
});

/**
 * Forgets a folder.
 *
 * The lists inside it stay and become unfiled, which the column says with `on
 * delete set null`. Somebody tidying their shelves has not asked to lose what
 * was on them.
 */
export const DELETE = apiRoute({
  scope: "lists.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "folder id", FOLDER_ID);
    return await db(async (client) => {
      const { rows } = await client.query(
        `delete from public.list_folders
          where id::text = $1 or public_id = $1 returning id`,
        [id],
      );
      if (!rows[0])
        throw new ApiFailure("not_found", "No folder with that id.");
      return { data: { id: rows[0].id, deleted: true } };
    });
  },
});
