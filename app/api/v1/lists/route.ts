import { ownedCollection } from "@/lib/api/collection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = ownedCollection({
  scope: "lists.read",
  table: "game_lists",
  columns:
    "id, public_id, name, description, visibility, ranked, kind, created_at, updated_at",
  order: "updated_at desc, id desc",
});
