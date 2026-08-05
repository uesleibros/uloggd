import type { NextRequest } from "next/server";
import { z } from "zod";
import { getActivity, getFollowingIds } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid().optional(),
  game: z.coerce.number().int().positive().optional(),
  feed: z.enum(["following", "community"]).optional(),
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
  const supabase = await getSupabase();
  // Reviews from everybody, for the browse page. The guard above wants an
  // author or a game so that nobody can page through the entire platform, and
  // this is the one exception: these are the same public reviews the home page
  // already shows to signed-out visitors, so the only thing being widened is
  // how many of them can be read, which was the problem.
  if (feed === "community") {
    const entries = await getActivity(supabase, {
      before,
      limit,
      kinds: ["review"],
      rating,
      spoilers,
      order,
      search: q,
    });
    return Response.json({ entries });
  }
  if (feed === "following") {
    const viewer = await getAuthUser();
    if (!viewer)
      return Response.json({ error: "unauthorized" }, { status: 401 });
    const following = await getFollowingIds(supabase, viewer.id);
    const entries = await getActivity(supabase, {
      profileIds: following,
      viewerId: viewer.id,
      before,
      limit,
    });
    return Response.json({ entries });
  }
  const entries = await getActivity(supabase, {
    profileId: profile,
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
  return Response.json({ entries });
}
