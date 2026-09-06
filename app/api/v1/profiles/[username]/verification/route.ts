import { segmentBefore } from "@/lib/api/path";
import { apiRoute } from "@/lib/api/route";
import { resolveUsername } from "@/lib/api/social";

/**
 * A username, or the id behind one.
 *
 * A name is what somebody reading a profile has, and an id is what a page
 * that already loaded the row has. Both name the same account, and refusing
 * one of them would only make every caller look up what it already knew.
 */
const NAME_OR_ID = /^[A-Za-z0-9_-]{1,64}$/;
const IS_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who vouched for an account, and when.
 *
 * No scope: the badge is already on the profile for anyone to see, and this
 * only says what the badge means. An account that was never verified answers
 * with null rather than a refusal — "no" is an answer here, not a secret.
 */
export const GET = apiRoute({
  bucket: "read",
  handle: async ({ request, db }) => {
    const who = segmentBefore(request, 1, "username", NAME_OR_ID);

    return await db(async (client) => {
      const target = IS_ID.test(who)
        ? who
        : await resolveUsername(client, who);
      const { rows } = await client.query(
        `select verified_at, verifier_username, verifier_display_name,
                verifier_avatar_url
           from public.profile_verification(target => $1)`,
        [target],
      );
      return { data: rows[0] ?? null };
    });
  },
});
