import type { NextRequest } from "next/server";
import { z } from "zod";
import { getListPreviews } from "@/lib/lists";
import { LIST_PAGE_SIZE, LIST_PAGE_SIZE_MAX } from "@/lib/lists-types";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";

const querySchema = z.object({
  profile: z.uuid(),
  before: z.iso.datetime({ offset: true }).optional(),
  offset: z.coerce.number().int().min(0).max(2_000).optional(),
  q: z.string().trim().max(60).optional(),
  visibility: z.enum(["ALL", "PUBLIC", "FOLLOWERS", "PRIVATE"]).optional(),
  mode: z.enum(["ALL", "RANKED", "COLLECTION"]).optional(),
  sort: z.enum(["recent", "oldest", "name", "size", "likes"]).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_PAGE_SIZE_MAX)
    .default(LIST_PAGE_SIZE),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "invalid" }, { status: 400 });
  const { profile, before, offset, limit, q, visibility, mode, sort } =
    parsed.data;
  const [supabase, viewer] = await Promise.all([getSupabase(), getAuthUser()]);
  const isOwner = viewer?.id === profile;
  const lists = await getListPreviews(supabase, {
    ownerId: profile,
    viewerId: viewer?.id ?? null,
    publicOnly: !isOwner,
    before,
    offset,
    limit,
    query: q || undefined,
    // Non-owners only ever look at public lists — the filter selector is
    // owner-only in the UI, so ignore anything else that reaches this route.
    visibility: isOwner ? visibility : undefined,
    mode: isOwner ? mode : undefined,
    sort: isOwner ? sort : undefined,
  });
  return Response.json({ lists });
}
