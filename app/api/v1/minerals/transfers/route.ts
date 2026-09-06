import { jsonBody, optionalText } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { resolveUsername } from "@/lib/api/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINERALS = /^[A-Z_]{1,40}$/;

/**
 * Sending minerals to somebody.
 *
 * Every amount is checked again by the database, which is also the only place
 * that knows what the sender has: it names the mineral that ran short, and
 * that message is worth more than a generic refusal, so it comes back as it
 * was written.
 */
export const POST = apiRoute({
  scope: "profile.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const username = optionalText(body, "username", 40);
    if (!username)
      throw new ApiFailure("invalid_request", "username is required.");

    const items = body.items;
    if (
      !items ||
      typeof items !== "object" ||
      Array.isArray(items) ||
      Object.keys(items).length === 0 ||
      Object.entries(items).some(
        ([mineral, amount]) =>
          !MINERALS.test(mineral) ||
          typeof amount !== "number" ||
          !Number.isInteger(amount) ||
          amount <= 0,
      )
    )
      throw new ApiFailure(
        "invalid_request",
        "items must name at least one mineral with a whole amount above zero.",
      );

    return await db(async (client) => {
      const recipient = await resolveUsername(client, username);
      const { rows } = await client.query<{ id: string }>(
        `select public.send_minerals(
           recipient => $1, items => $2::jsonb, note => $3) as id`,
        [recipient, JSON.stringify(items), optionalText(body, "note", 280)],
      );
      return { data: { id: rows[0]?.id ?? null, username } };
    });
  },
});
