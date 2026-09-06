import { jsonBody, optionalText } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HANDLE = /^[a-z0-9][a-z0-9_]{1,22}[a-z0-9]$/;

function candidate(body: Record<string, unknown>) {
  const asked = optionalText(body, "username", 24)?.trim().toLowerCase();
  if (!asked) throw new ApiFailure("invalid_request", "username is required.");
  if (!HANDLE.test(asked))
    throw new ApiFailure(
      "invalid_request",
      "A username is 3 to 24 characters of a-z, 0-9 and _, and cannot start or end with _.",
    );
  return asked;
}

/** Whether a name is free, before anybody tries to take it. */
export const GET = apiRoute({
  sessionOnly: true,
  bucket: "read",
  handle: async ({ request, db }) => {
    const asked = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (!HANDLE.test(asked.toLowerCase()))
      return { data: { username: asked, available: false } };

    const free = await db(async (client) => {
      const { rows } = await client.query<{ free: boolean }>(
        "select public.username_available(candidate => $1) as free",
        [asked],
      );
      return rows[0]?.free ?? false;
    });
    return { data: { username: asked, available: free } };
  },
});

/**
 * Taking a name for the first time.
 *
 * Separate from PATCH because they are different acts with different rules:
 * an account without a name yet is finishing signing up, and one with a name
 * is renaming, which waits out a cooldown and leaves a trail. Folding them
 * into one verb would mean the first person through the door silently gets
 * the rules of the second.
 */
export const PUT = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const asked = candidate(await jsonBody(request));
    const taken = await db(async (client) => {
      const { rows } = await client.query<{ username: string }>(
        "select public.claim_username(candidate => $1) as username",
        [asked],
      );
      return rows[0]?.username ?? null;
    });
    return { data: { username: taken } };
  },
});

export const PATCH = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const asked = candidate(await jsonBody(request));
    const changed = await db(async (client) => {
      const { rows } = await client.query(
        `select username, changed_at, next_change_at
           from public.change_username(candidate => $1)`,
        [asked],
      );
      return rows[0] ?? null;
    });
    if (!changed)
      throw new ApiFailure("invalid_request", "That name could not be taken.");
    return { data: changed };
  },
});
