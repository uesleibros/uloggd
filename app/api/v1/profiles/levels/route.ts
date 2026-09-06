import { apiRoute, ApiFailure } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Standing for a set of accounts at once.
 *
 * A page renders many cards, each wanting the same thing about a different
 * person, and asking per card is how a list of twenty becomes twenty
 * requests. The ids come in one parameter and the answer comes back keyed by
 * them.
 */
export const GET = apiRoute({
  bucket: "read",
  handle: async ({ request, db }) => {
    const asked = (new URL(request.url).searchParams.get("ids") ?? "")
      .split(",")
      .map((one) => one.trim())
      .filter(Boolean);

    if (asked.length === 0 || asked.length > 100 || asked.some((one) => !ID.test(one)))
      throw new ApiFailure(
        "invalid_request",
        "ids must be 1 to 100 account ids, separated by commas.",
      );

    const levels = await db(async (client) => {
      const { rows } = await client.query(
        "select * from public.profile_levels(targets => $1::uuid[])",
        [asked],
      );
      return rows;
    });
    return { data: levels };
  },
});
