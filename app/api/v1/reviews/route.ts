import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "reviews.read",
  table: "reviews",
  columns:
    "id, public_id, igdb_id, game_slug, title, content, rating, rating_mode, recommended, mastered, replay, contains_spoilers, visibility, platform, started_on, finished_on, journey_id, created_at, updated_at",
  order: "created_at desc, id desc",
});
