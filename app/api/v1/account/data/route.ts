import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = [
  "library",
  "reviews",
  "sessions",
  "journeys",
  "lists",
  "screenshots",
  "comments",
  "views",
  "everything",
] as const;

/**
 * Throwing away one kind of thing, on purpose and by name.
 *
 * The category is required and never defaults: a delete that guesses what it
 * was asked to remove is a delete nobody can take back.
 */
export const DELETE = apiRoute({
  sessionOnly: true,
  bucket: "write",
  handle: async ({ request, db }) => {
    const category = new URL(request.url).searchParams.get("category") ?? "";
    if (!(CATEGORIES as readonly string[]).includes(category))
      throw new ApiFailure(
        "invalid_request",
        `category must be one of ${CATEGORIES.join(", ")}.`,
      );

    const removed = await db(async (client) => {
      const { rows } = await client.query<{ removed: string }>(
        "select public.erase_account_data(category => $1) as removed",
        [category],
      );
      return Number(rows[0]?.removed ?? 0);
    });
    return { data: { category, removed } };
  },
});
