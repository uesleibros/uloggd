import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OwnerRow = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  avatar_url: string | null;
  verified: boolean;
  role?: "USER" | "MODERATOR" | "ADMIN";
};

export const GET = apiRoute({
  bucket: "read",
  handle: async ({ identity, db }) => {
    const owner = await db(async (client) => {
      const { rows } = await client.query<OwnerRow>(
        `select id, username, display_name, created_at, avatar_url, verified
                ${identity.kind === "session" ? ", public.own_account_role() as role" : ""}
           from public.profiles
          where id = $1`,
        [identity.profileId],
      );
      return rows[0] ?? null;
    });

    if (!owner)
      throw new ApiFailure("not_found", "This account no longer exists.");

    return {
      key:
        identity.kind === "key"
          ? { id: identity.keyId, scopes: identity.scopes }
          : null,
      owner: {
        id: owner.id,
        username: owner.username,
        display_name: owner.display_name,
        created_at: owner.created_at,
        avatar_url: owner.avatar_url,
        verified: owner.verified,
        ...(owner.role ? { role: owner.role } : {}),
      },
    };
  },
});
