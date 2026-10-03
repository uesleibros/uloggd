import { readContent, readContentContext } from "@/lib/api/content-read";
import type { ScreenshotRecord } from "@/lib/content-types";
import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { applyCommentsScope } from "@/lib/api/comments";
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

    // The transaction queues cleanup. Shared references and failed deletes
    // are checked by the backend worker after commit.
    const removed = await db(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        "delete from public.screenshots where id = $1 returning id",
        [id],
      );
      return { found: rows.length > 0 };
    });

    if (!removed.found)
      throw new ApiFailure("not_found", "No screenshot of yours with that id.");

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
      visibility === null &&
      body.comments_scope === undefined
    )
      throw new ApiFailure(
        "invalid_request",
        "Send at least one of description, contains_spoilers, sensitive, visibility or comments_scope.",
      );

    // No definer function for this one: the website edits the row directly and
    // row level security is what decides, so this does the same rather than
    // inventing a second way in.
    const saved = await db(async (client) => {
      await applyCommentsScope(client, "screenshot", id, body);
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
                  comments_scope, updated_at`,
        [id, description, spoilers, sensitive, visibility],
      );
      return rows[0] ?? null;
    });

    if (!saved)
      throw new ApiFailure("not_found", "No screenshot of yours with that id.");
    return { data: saved };
  },
});

export const GET = apiRoute({
  public: true,
  scope: "screenshots.read",
  bucket: "read",
  handle: async ({ request, identity, db }) =>
    db(async (client) => {
      const id = decodeURIComponent(
        new URL(request.url).pathname.split("/").pop() ?? "",
      );
      const data = await readContent<ScreenshotRecord>(
        client,
        "screenshot",
        id,
      );
      const context = await readContentContext(
        client,
        identity?.profileId ?? null,
        "screenshot",
        data,
      );

      return { data, context };
    }),
});
