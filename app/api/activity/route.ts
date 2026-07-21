import type { NextRequest } from "next/server";
import { z } from "zod";
import { getActivity, getFollowingIds } from "@/lib/social";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid().optional(),
  game: z.coerce.number().int().positive().optional(),
  feed: z.literal("following").optional(),
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
  const { profile, game, feed, before, limit } = parsed.data;
  const supabase = await getSupabase();
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
  });
  return Response.json({ entries });
}
