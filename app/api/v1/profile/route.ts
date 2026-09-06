import {
  jsonBody,
  optionalBool,
  optionalOneOf,
  optionalText,
} from "@/lib/api/body";
import { COMMENT_SCOPES, VISIBILITIES } from "@/lib/api/enums";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS = `id, username, display_name, bio, pronouns, avatar_url, banner_url,
  thought, locale, verified, account_type, organization_tagline,
  organization_category, organization_url, is_private, profile_visibility,
  library_visibility, content_comment_scope, profile_comment_scope,
  custom_cover_scope, steam_playing_visible, twitch_live_visible, drawer,
  created_at, updated_at`;

/** Who may see a profile at all. Narrower than Visibility: never PRIVATE. */
const AUDIENCES = ["EVERYONE", "FOLLOWERS"] as const;

/** A chosen cover is either the owner's alone or everybody's. */
const COVER_SCOPES = ["OWN", "EVERYONE"] as const;

const ACCOUNT_TYPES = ["PERSON", "ORGANIZATION"] as const;

/**
 * The settings that are a column apiece with a function apiece.
 *
 * update_profile_settings takes the display fields as one set; each of these
 * has its own definer function instead, because each carries a rule of its
 * own — opening a private account approves everything that was waiting, and
 * changing an account's type clears the fields the other type does not have.
 * Reaching them through one PATCH is the caller's convenience, not a merge.
 */
type Switch = {
  field: string;
  call: string;
  argument: string;
  read: (body: Record<string, unknown>) => unknown;
};

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

const SWITCHES: Switch[] = [
  {
    field: "is_private",
    call: "set_profile_privacy",
    argument: "private",
    read: (body) => optionalBool(body, "is_private"),
  },
  {
    field: "profile_visibility",
    call: "set_privacy_scopes",
    argument: "visibility",
    read: (body) => optionalOneOf(body, "profile_visibility", AUDIENCES),
  },
  {
    field: "content_comment_scope",
    call: "set_privacy_scopes",
    argument: "comment_scope",
    read: (body) => optionalOneOf(body, "content_comment_scope", COMMENT_SCOPES),
  },
  {
    field: "profile_comment_scope",
    call: "set_profile_comment_scope",
    argument: "new_scope",
    read: (body) => optionalOneOf(body, "profile_comment_scope", COMMENT_SCOPES),
  },
  {
    field: "custom_cover_scope",
    call: "set_custom_cover_scope",
    argument: "new_scope",
    read: (body) => optionalOneOf(body, "custom_cover_scope", COVER_SCOPES),
  },
  {
    field: "steam_playing_visible",
    call: "set_steam_playing_visible",
    argument: "visible",
    read: (body) => optionalBool(body, "steam_playing_visible"),
  },
  {
    field: "twitch_live_visible",
    call: "set_twitch_live_visible",
    argument: "visible",
    read: (body) => optionalBool(body, "twitch_live_visible"),
  },
  {
    field: "drawer",
    call: "update_profile_drawer",
    argument: "new_drawer",
    read: (body) => optionalText(body, "drawer", 10_000),
  },
];

export const PATCH = apiRoute({
  scope: "profile.write",
  bucket: "write",
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const changes = WRITABLE.map(
      ([field, max]) => [field, optionalText(body, field, max)] as const,
    ).filter(([, value]) => value !== null);
    // Not update_profile_settings' arguments: each is a column of its own with
    // a function of its own, so they are applied beside it.
    const libraryVisibility = optionalOneOf(
      body,
      "library_visibility",
      VISIBILITIES,
    );
    const switches = SWITCHES.map(
      (one) => [one, one.read(body)] as const,
    ).filter(([, value]) => value !== null);
    const accountType = optionalOneOf(body, "account_type", ACCOUNT_TYPES);

    if (
      changes.length === 0 &&
      libraryVisibility === null &&
      switches.length === 0 &&
      accountType === null
    )
      throw new ApiFailure(
        "invalid_request",
        `Send at least one of ${WRITABLE.map(([field]) => field).join(", ")} or library_visibility.`,
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

      if (libraryVisibility !== null)
        await client.query(
          "select public.set_library_visibility(next_visibility => $1)",
          [libraryVisibility],
        );

      for (const [one, value] of switches)
        await client.query(
          `select public.${one.call}(${one.argument} => $1)`,
          [value],
        );

      // Everything but the type is cleared when the account is a person, and
      // the database does that itself: sending the fields regardless would
      // have them stored and then wiped, which reads as a save that did not.
      if (accountType !== null) {
        const organization = accountType === "ORGANIZATION";
        await client.query(
          `select public.set_account_type(
             next_type => $1, next_tagline => $2, next_category => $3,
             next_url => $4, next_company => $5)`,
          [
            accountType,
            organization ? optionalText(body, "organization_tagline", 120) : null,
            organization
              ? optionalText(body, "organization_category", 60)
              : null,
            organization ? optionalText(body, "organization_url", 300) : null,
            organization ? optionalText(body, "organization_company", 120) : null,
          ],
        );
      }

      // The function takes the whole set, so anything the request left out has
      // to be sent back as it stands or it would be cleared.
      const next = WRITABLE.map(([field]) =>
        asked.has(field) ? asked.get(field) : current[0][field],
      );

      if (changes.length)
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
