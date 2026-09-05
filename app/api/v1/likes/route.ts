import { jsonBody, optionalOneOf, optionalUuid } from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";
import { LIKEABLE } from "@/lib/api/targets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A like, turned over rather than set.
 *
 * The database offers one statement that flips the like and counts what is
 * left, in one transaction. Dressing that as PUT and DELETE would mean reading
 * the current state first and then writing the opposite, and two taps in quick
 * succession would race each other into the wrong answer. So the honest shape
 * is the one the database actually has: ask it to turn the like over, and it
 * says which side came up.
 */
export const POST = apiRoute({
  scope: "likes.write",
  bucket: "write",
  handle: async ({ request, db }) => {
    const body = await jsonBody(request);
    const on = optionalOneOf(body, "on", LIKEABLE);
    if (!on) throw new ApiFailure("invalid_request", "on is required.");
    const id = optionalUuid(body, "id");
    if (!id) throw new ApiFailure("invalid_request", "id is required.");

    return await db(async (client) => {
      const { rows } = await client.query<{
        liked: boolean;
        like_count: string;
      }>(
        `select liked, like_count from public.toggle_content_like(
           target_type => $1, target_id => $2)`,
        [on, id],
      );
      const answer = rows[0];
      if (!answer)
        throw new ApiFailure("not_found", "Nothing of that kind with that id.");
      return {
        data: {
          on,
          id,
          liked: answer.liked,
          like_count: Number(answer.like_count),
        },
      };
    });
  },
});
