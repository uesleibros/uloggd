import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = `id, username, display_name, bio, pronouns, avatar_url, banner_url,
  thought, locale, verified, account_type, organization_tagline,
  organization_category, organization_url, is_private, profile_visibility,
  library_visibility, created_at, updated_at`;

export const GET = apiRoute({
  scope: "profile.read",
  bucket: "read",
  handle: async ({ identity, db }) => {
    const profile = await db(async (client) => {
      const { rows } = await client.query(
        `select ${COLUMNS} from public.profiles where id = $1`,
        [identity.profileId],
      );
      return rows[0] ?? null;
    });
    if (!profile)
      throw new ApiFailure("not_found", "This key's owner no longer exists.");
    return { data: profile };
  },
});
