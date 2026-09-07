import { z } from "zod";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { readProfile } from "@/lib/api/profile-read";
import { segmentBefore, HANDLE } from "@/lib/api/path";
import type { ScreenshotPreview } from "@/lib/screenshot-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const query = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  q: z.string().trim().max(60).default(""),
  spoilers: z.enum(["all", "safe", "spoilers"]).default("all"),
  sort: z.enum(["new", "old"]).default("new"),
  game: z.string().max(100).default(""),
});
export const GET = apiRoute({
  public: true,
  scope: "screenshots.read",
  bucket: "read",
  handle: async ({ request, db }) => {
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiFailure("invalid_request", "Invalid screenshot filters.");
    const options = parsed.data;
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      const pattern = options.q
        ? `%${options.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
        : null;
      const values = [
        profile.id,
        options.spoilers === "all" ? null : options.spoilers === "spoilers",
        options.game || null,
        pattern,
      ];
      const filter = `profile_id = $1 and ($2::boolean is null or contains_spoilers = $2)
        and ($3::text is null or game_slug = $3)
        and ($4::text is null or description ilike $4 or game_slug ilike $4)`;
      const [items, stats, games, matching] = await Promise.all([
        client.query<ScreenshotPreview>(
          `select id,public_id,igdb_id,game_slug,image_url,description,contains_spoilers,width,height,created_at
          from public.screenshots where ${filter} order by created_at ${options.sort === "old" ? "asc" : "desc"},id desc limit 48 offset $5`,
          [...values, (options.page - 1) * 48],
        ),
        client.query<{
          total: number;
          safe_count: number;
          spoiler_count: number;
        }>(
          `select count(*)::int as total,
          count(*) filter(where not contains_spoilers)::int as safe_count,
          count(*) filter(where contains_spoilers)::int as spoiler_count from public.screenshots where profile_id = $1`,
          [profile.id],
        ),
        client.query<{ igdb_id: number; game_slug: string }>(
          "select distinct igdb_id,game_slug from public.screenshots where profile_id = $1 order by game_slug",
          [profile.id],
        ),
        client.query<{ count: number }>(
          `select count(*)::int as count from public.screenshots where ${filter}`,
          values,
        ),
      ]);
      const ids = items.rows.map((row) => row.id);
      const [likes, comments] = ids.length
        ? await Promise.all([
            client.query(
              "select * from public.get_content_likes(target_type => 'screenshot',target_ids => $1::uuid[])",
              [ids],
            ),
            client.query(
              "select * from public.get_content_comment_counts(target_type => 'screenshot',target_ids => $1::uuid[])",
              [ids],
            ),
          ])
        : [{ rows: [] }, { rows: [] }];
      return {
        data: items.rows,
        ...stats.rows[0],
        matching: matching.rows[0].count,
        games: games.rows,
        likes: likes.rows,
        comments: comments.rows,
      };
    });
  },
});
