import {
  jsonBody,
  optionalBool,
  optionalDate,
  optionalInt,
  optionalOneOf,
  optionalText,
  requireInt,
  requireSlug,
} from "@/lib/api/body";
import { ownedCollection } from "@/lib/api/collection";
import { apiRoute } from "@/lib/api/route";
import { RATING_MODES, VISIBILITIES } from "@/lib/api/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "reviews.read",
  table: "reviews",
  columns:
    "id, public_id, igdb_id, game_slug, title, content, rating, rating_mode, recommended, mastered, replay, contains_spoilers, visibility, platform, started_on, finished_on, journey_id, created_at, updated_at",
  order: "created_at desc, id desc",
});

export const POST = apiRoute({
  scope: "reviews.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const parameters = [
      requireInt(body, "igdb_id"),
      requireSlug(body, "game_slug"),
      optionalText(body, "content", 5000) ?? "",
      optionalText(body, "title", 80),
      optionalInt(body, "rating", 0, 100),
      optionalOneOf(body, "rating_mode", RATING_MODES),
      optionalOneOf(body, "visibility", VISIBILITIES) ?? "PUBLIC",
      optionalBool(body, "contains_spoilers") ?? false,
      optionalBool(body, "recommended"),
      optionalBool(body, "mastered") ?? false,
      optionalBool(body, "replay") ?? false,
      optionalText(body, "platform", 80),
      optionalDate(body, "started_on"),
      optionalDate(body, "finished_on"),
    ];

    const created = await db(async (client) => {
      const { rows } = await client.query(
        `select id, public_id, igdb_id, game_slug, title, content, rating,
                rating_mode, visibility, contains_spoilers, created_at
           from public.create_review(
           game_id => $1, game_slug => $2, review_content => $3,
           review_title => $4, review_rating => $5, review_rating_mode => $6,
           review_visibility => $7::public."Visibility", spoilers => $8,
           review_recommended => $9, review_mastered => $10,
           review_replay => $11, review_platform => $12,
           review_started_on => $13, review_finished_on => $14
         )`,
        parameters,
      );
      return rows[0];
    });

    return { data: created };
  },
});
