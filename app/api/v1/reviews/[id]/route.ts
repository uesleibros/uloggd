import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { RATING_MODES, VISIBILITIES } from "@/lib/api/enums";
import { lastSegment, UUID } from "@/lib/api/path";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = apiRoute({
  scope: "reviews.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "review id", UUID);
    const body = await jsonBody(request);

    return await db(async (client) => {
      const { rows: existing } = await client.query(
        `select id, title, content, rating, rating_mode, visibility,
                contains_spoilers, recommended, mastered, replay, platform,
                started_on, finished_on
           from public.reviews where id = $1`,
        [id],
      );
      const before = existing[0];
      if (!before)
        throw new ApiFailure("not_found", "No review of yours with that id.");

      const keep = <T>(next: T | null, current: T) =>
        next === null ? current : next;

      await client.query(
        `select public.update_review(
           review_id => $1, review_content => $2, review_title => $3,
           review_rating => $4, review_rating_mode => $5,
           review_visibility => $6::public."Visibility", spoilers => $7,
           review_recommended => $8, review_mastered => $9,
           review_replay => $10, review_platform => $11,
           review_started_on => $12, review_finished_on => $13
         )`,
        [
          id,
          keep(optionalText(body, "content", 5000), before.content),
          keep(optionalText(body, "title", 80), before.title),
          keep(optionalInt(body, "rating", 0, 100), before.rating),
          keep(
            optionalOneOf(body, "rating_mode", RATING_MODES),
            before.rating_mode,
          ),
          keep(
            optionalOneOf(body, "visibility", VISIBILITIES),
            before.visibility,
          ),
          keep(
            optionalBool(body, "contains_spoilers"),
            before.contains_spoilers,
          ),
          keep(optionalBool(body, "recommended"), before.recommended),
          keep(optionalBool(body, "mastered"), before.mastered),
          keep(optionalBool(body, "replay"), before.replay),
          keep(optionalText(body, "platform", 80), before.platform),
          keep(optionalDate(body, "started_on"), before.started_on),
          keep(optionalDate(body, "finished_on"), before.finished_on),
        ],
      );

      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, title, content, rating,
                rating_mode, visibility, contains_spoilers, updated_at
           from public.reviews where id = $1`,
        [id],
      );
      return { data: rows[0] };
    });
  },
});

export const DELETE = apiRoute({
  scope: "reviews.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const id = lastSegment(request, "review id", UUID);
    const removed = await db(async (client) => {
      const { rowCount } = await client.query(
        "delete from public.reviews where id = $1",
        [id],
      );
      return rowCount ?? 0;
    });
    if (removed === 0)
      throw new ApiFailure("not_found", "No review of yours with that id.");
    return { data: { id, deleted: true } };
  },
});
