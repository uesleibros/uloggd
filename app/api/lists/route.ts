import type { NextRequest } from "next/server";
import { z } from "zod";
import { readListPreviews } from "@/lib/api/list-preview-read";
import { asOwner } from "@/lib/api/owner";
import { LIST_PAGE_SIZE, LIST_PAGE_SIZE_MAX } from "@/lib/lists-types";
import { getAuthUser } from "@/lib/supabase/auth";

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
  const viewer = await getAuthUser();
  const isOwner = viewer?.id === profile;
  const result = await asOwner(viewer?.id ?? null, (client) =>
    readListPreviews(client, profile, viewer?.id ?? null, {
      before,
      offset: offset ?? 0,
      limit,
      query: q || undefined,
      visibility: isOwner ? visibility : "PUBLIC",
      mode: isOwner ? mode : undefined,
      sort: isOwner ? sort : undefined,
    }),
  );
  return Response.json({ lists: result.data });
}
