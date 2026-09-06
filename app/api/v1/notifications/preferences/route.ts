import { jsonBody, optionalBool } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SWITCHES = [
  "follows_enabled",
  "review_likes_enabled",
  "list_likes_enabled",
  "comments_enabled",
  "screenshots_enabled",
  "journal_likes_enabled",
] as const;

/**
 * What the account wants to be told about.
 *
 * A row may not exist yet (the defaults live on the columns, not in a row
 * written at sign-up), so this inserts on the way past rather than refusing to
 * change a preference nobody has set before.
 */
export const PATCH = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const asked = SWITCHES.map(
      (name) => [name, optionalBool(body, name)] as const,
    ).filter(([, value]) => value !== null);

    if (asked.length === 0)
      throw new ApiFailure(
        "invalid_request",
        `Send at least one of ${SWITCHES.join(", ")}.`,
      );

    const saved = await db(async (client) => {
      const columns = asked.map(([name]) => name);
      const values = asked.map(([, value]) => value);
      const places = columns.map((_, index) => `$${index + 2}`);
      const { rows } = await client.query(
        `insert into public.notification_preferences (profile_id, ${columns.join(", ")})
         values ($1, ${places.join(", ")})
         on conflict (profile_id) do update set
           ${columns.map((name, index) => `${name} = ${places[index]}`).join(", ")},
           updated_at = now()
         returning ${SWITCHES.join(", ")}`,
        [identity.profileId, ...values],
      );
      return rows[0];
    });

    return { data: saved };
  },
});
