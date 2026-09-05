import { removeImage } from "@/lib/imgchest";
import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { VISIBILITIES } from "@/lib/api/enums";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = apiRoute({
  scope: "screenshots.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "screenshot id", UUID);

    // The row goes first. If the image host is unreachable the picture is
    // orphaned there, which is a file nobody can reach; the other order leaves
    // a row pointing at nothing, which is a broken picture on a page.
    const removed = await db(async (client) => {
      const { rows } = await client.query<{ remote_id: string | null }>(
        "delete from public.screenshots where id = $1 returning remote_id",
        [id],
      );
      // Whether a row went is `rows.length`, not whether it carried a remote
      // id: a row with none is still a row, and reading the id as the answer
      // would report a successful delete as a miss.
      return { found: rows.length > 0, remote: rows[0]?.remote_id ?? null };
    });

    if (!removed.found)
      throw new ApiFailure("not_found", "No screenshot of yours with that id.");

    if (removed.remote) await removeImage(removed.remote, "screenshots");
    return { data: { id, deleted: true } };
  },
});

export const PATCH = apiRoute({
  scope: "screenshots.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "screenshot id", UUID);
    const body = await jsonBody(request);

    const description = optionalText(body, "description", 2200);
    const spoilers = optionalBool(body, "contains_spoilers");
    const sensitive = optionalBool(body, "sensitive");
    const visibility = optionalOneOf(body, "visibility", VISIBILITIES);

    if (
      description === null &&
      spoilers === null &&
      sensitive === null &&
      visibility === null
    )
      throw new ApiFailure(
        "invalid_request",
        "Send at least one of description, contains_spoilers, sensitive or visibility.",
      );

    // No definer function for this one: the website edits the row directly and
    // row level security is what decides, so this does the same rather than
    // inventing a second way in.
    const saved = await db(async (client) => {
      const { rows } = await client.query(
        `update public.screenshots
            set description = coalesce($2, description),
                contains_spoilers = coalesce($3, contains_spoilers),
                sensitive = coalesce($4, sensitive),
                visibility = coalesce($5::public."Visibility", visibility),
                updated_at = now()
          where id = $1 and deleted_at is null
        returning id, public_id, igdb_id, game_slug, description, image_url,
                  width, height, contains_spoilers, sensitive, visibility,
                  updated_at`,
        [id, description, spoilers, sensitive, visibility],
      );
      return rows[0] ?? null;
    });

    if (!saved)
      throw new ApiFailure("not_found", "No screenshot of yours with that id.");
    return { data: saved };
  },
});
