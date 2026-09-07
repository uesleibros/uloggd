import { z } from "zod";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { readProfile } from "@/lib/api/profile-read";
import { readListPreviews } from "@/lib/api/list-preview-read";
import { segmentBefore, HANDLE } from "@/lib/api/path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({
  visibility: z.enum(["ALL", "PUBLIC", "FOLLOWERS", "PRIVATE"]).default("ALL"),
  mode: z.enum(["ALL", "COLLECTION", "RANKED"]).default("ALL"),
  sort: z.enum(["recent", "oldest", "name", "size", "likes"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  offset: z.coerce.number().int().min(0).max(48000).default(0),
  before: z.iso.datetime({ offset: true }).optional(),
  q: z.string().max(60).optional(),
});
export const GET = apiRoute({
  public: true,
  scope: "lists.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const parsed = schema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success)
      throw new ApiFailure("invalid_request", "Invalid list filters.");
    return db(async (client) => {
      const profile = await readProfile(
        client,
        segmentBefore(request, 1, "username", HANDLE),
      );
      return readListPreviews(client, profile.id, identity?.profileId ?? null, {
        ...parsed.data,
        query: parsed.data.q,
      });
    });
  },
});
