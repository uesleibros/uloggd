import { jsonBody, optionalText } from "@/lib/api/body";
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

const WRITABLE = [
  ["display_name", 60],
  ["bio", 500],
  ["pronouns", 40],
  ["thought", 140],
  ["youtube_username", 60],
  ["instagram_username", 60],
  ["twitter_username", 60],
] as const;

export const PATCH = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const changes = WRITABLE.map(
      ([field, max]) => [field, optionalText(body, field, max)] as const,
    ).filter(([, value]) => value !== null);

    if (changes.length === 0)
      throw new ApiFailure(
        "invalid_request",
        `Send at least one of ${WRITABLE.map(([field]) => field).join(", ")}.`,
      );

    const asked = new Map(changes);

    const profile = await db(async (client) => {
      const { rows: current } = await client.query(
        `select display_name, bio, pronouns, thought, youtube_username,
                instagram_username, twitter_username
           from public.profiles where id = $1`,
        [identity.profileId],
      );
      if (!current[0]) return null;

      // The function takes the whole set, so anything the request left out has
      // to be sent back as it stands or it would be cleared.
      const next = WRITABLE.map(([field]) =>
        asked.has(field) ? asked.get(field) : current[0][field],
      );

      await client.query(
        `select public.update_profile_settings(
           new_display_name => $1, new_bio => $2, new_pronouns => $3,
           new_thought => $4, new_youtube_username => $5,
           new_instagram_username => $6, new_twitter_username => $7)`,
        next,
      );

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
