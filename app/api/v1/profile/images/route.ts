import { apiRoute, ApiFailure } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["AVATAR", "BANNER"] as const;

function kindOf(request: Request) {
  const asked = new URL(request.url).searchParams.get("kind") ?? "";
  if (!(KINDS as readonly string[]).includes(asked))
    throw new ApiFailure(
      "invalid_request",
      `kind must be ${KINDS.join(" or ")}.`,
    );
  return asked;
}

/**
 * The pictures this account has used before.
 *
 * Kept so somebody can go back to one without finding the file again. Putting
 * a new one up is the image pipeline's job, not this one's; here they are only
 * listed and forgotten.
 */
export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ request, identity, db }) => {
    const kind = kindOf(request);
    const slots = await db(async (client) => {
      const { rows } = await client.query(
        `select id, image_url, created_at
           from public.profile_image_history
          where profile_id = $1 and kind = $2
          order by created_at desc`,
        [identity.profileId, kind],
      );
      return rows;
    });
    return { data: slots };
  },
});
