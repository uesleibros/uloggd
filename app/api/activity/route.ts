import type { NextRequest } from "next/server";
import { z } from "zod";
import { readActivity } from "@/lib/api/activity-read";
import { asOwner } from "@/lib/api/owner";
import { getAuthUser } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid().optional(),
  game: z.coerce.number().int().positive().optional(),
  feed: z.literal("following").optional(),
  kind: z.enum(["review", "diary"]).optional(),
  section: z.literal("reviews").optional(),
  rating: z
    .enum(["rated", "great", "positive", "mixed", "low", "unrated"])
    .optional(),
  spoilers: z.enum(["all", "hide", "only"]).optional(),
  order: z.enum(["recent", "oldest"]).optional(),
  q: z.string().trim().max(80).optional(),
  before: z.iso.datetime({ offset: true }),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (
    !parsed.success ||
    (!parsed.data.profile && !parsed.data.game && !parsed.data.feed)
  )
    return Response.json({ error: "invalid" }, { status: 400 });
  const {
    profile,
    game,
    feed,
    kind,
    section,
    rating,
    spoilers,
    order,
    q,
    before,
    limit,
  } = parsed.data;
  const viewer = await getAuthUser();
  if (feed === "following" && !viewer)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  const entries = await asOwner(viewer?.id ?? null, async (client) => {
    const following =
      feed === "following"
        ? (
            await client.query<{ following_id: string }>(
              "select following_id from public.follows where follower_id=$1 limit 1000",
              [viewer!.id],
            )
          ).rows.map((row) => row.following_id)
        : undefined;
    return readActivity(client, viewer?.id ?? null, {
      profileId: profile,
      profileIds: following,
      gameId: game,
      before,
      limit,
      kinds: kind
        ? [kind]
        : section === "reviews"
          ? ["review", "diary"]
          : undefined,
      rating,
      spoilers,
      order,
      search: q,
    });
  });
  return Response.json({ entries });
}
