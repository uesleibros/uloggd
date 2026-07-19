import type { NextRequest } from "next/server";
import { z } from "zod";
import { getActivity } from "@/lib/social";
import { getSupabase } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid().optional(),
  game: z.coerce.number().int().positive().optional(),
  before: z.iso.datetime({ offset: true }),
  limit: z.coerce.number().int().min(1).max(60).default(30),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success || (!parsed.data.profile && !parsed.data.game))
    return Response.json({ error: "invalid" }, { status: 400 });
  const { profile, game, before, limit } = parsed.data;
  const supabase = await getSupabase();
  const entries = await getActivity(supabase, {
    profileId: profile,
    gameId: game,
    before,
    limit,
  });
  return Response.json({ entries });
}
