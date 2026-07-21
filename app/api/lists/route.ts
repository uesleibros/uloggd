import type { NextRequest } from "next/server";
import { z } from "zod";
import { getListPreviews } from "@/lib/lists";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid(),
  before: z.iso.datetime({ offset: true }).optional(),
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "invalid" }, { status: 400 });
  const { profile, before, limit, q } = parsed.data;
  const [supabase, viewer] = await Promise.all([getSupabase(), getAuthUser()]);
  const lists = await getListPreviews(supabase, {
    ownerId: profile,
    viewerId: viewer?.id ?? null,
    publicOnly: viewer?.id !== profile,
    before,
    limit,
    query: q || undefined,
  });
  return Response.json({ lists });
}
