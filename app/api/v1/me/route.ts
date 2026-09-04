import { identifyRequest } from "@/lib/api/auth";
import { apiError } from "@/lib/api/errors";
import { asOwner } from "@/lib/api/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OwnerRow = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const identity = await identifyRequest(request);
  if (!identity)
    return apiError("invalid_key", "This key is unknown, revoked or expired.");

  let owner: OwnerRow | null;
  try {
    owner = await asOwner(identity.profileId, async (client) => {
      const { rows } = await client.query<OwnerRow>(
        `select id, username, display_name, created_at
           from public.profiles
          where id = $1`,
        [identity.profileId],
      );
      return rows[0] ?? null;
    });
  } catch {
    return apiError("internal", "The request could not be completed.");
  }

  if (!owner)
    return apiError("not_found", "This key's owner no longer exists.");

  return Response.json({
    key: { id: identity.keyId, scopes: identity.scopes },
    owner: {
      id: owner.id,
      username: owner.username,
      display_name: owner.display_name,
      created_at: owner.created_at,
    },
  });
}
