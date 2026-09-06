import {
  jsonBody,
  optionalOneOf,
  optionalText,
  optionalUuid,
} from "@/lib/api/body";
import { ApiFailure, apiRoute } from "@/lib/api/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REASONS = [
  "HARASSMENT",
  "HATE_SPEECH",
  "SPAM",
  "IMPERSONATION",
  "SEXUAL_CONTENT",
  "CHILD_SAFETY",
  "SELF_HARM",
  "VIOLENCE",
  "PRIVACY",
  "OTHER",
] as const;

/** Where each kind of content lives, and which column names its author. */
const WHERE: Record<string, { table: string; owner: string }> = {
  REVIEW: { table: "reviews", owner: "profile_id" },
  LIST: { table: "game_lists", owner: "profile_id" },
  SCREENSHOT: { table: "screenshots", owner: "profile_id" },
  DIARY: { table: "diary_entries", owner: "profile_id" },
  PROFILE_COMMENT: { table: "profile_comments", owner: "author_id" },
  CONTENT_COMMENT: { table: "content_comments", owner: "author_id" },
};

/** What can be reported. PROFILE is the account itself and carries no id. */
const KINDS = [
  "PROFILE",
  "REVIEW",
  "LIST",
  "SCREENSHOT",
  "DIARY",
  "PROFILE_COMMENT",
  "CONTENT_COMMENT",
] as const;

/**
 * Telling moderation about something.
 *
 * There is no read side and there will not be one. A report is a message to
 * the people who handle them. Letting the reporter watch its progress, or
 * letting anyone count how often an account has been reported, turns the
 * queue into a weapon. The answer says it arrived, and nothing else.
 */
export const POST = apiRoute({
  scope: "social.write",
  bucket: "write",
  status: 201,
  handle: async ({ request, identity, db }) => {
    const body = await jsonBody(request);
    const kind = optionalOneOf(body, "on", KINDS);
    if (!kind) throw new ApiFailure("invalid_request", "on is required.");
    const reason = optionalOneOf(body, "reason", REASONS);
    if (!reason)
      throw new ApiFailure("invalid_request", "reason is required.");
    const contentId = optionalUuid(body, "id");
    if (kind !== "PROFILE" && !contentId)
      throw new ApiFailure(
        "invalid_request",
        "id is required for anything but a PROFILE report.",
      );

    const username = optionalText(body, "username", 40);
    if (!username)
      throw new ApiFailure(
        "invalid_request",
        "username is required: a report names the account it is about.",
      );

    return await db(async (client) => {
      const { rows: named } = await client.query<{ id: string }>(
        "select id from public.profiles where lower(username) = lower($1)",
        [username],
      );
      const target = named[0];
      if (!target)
        throw new ApiFailure("not_found", "No account with that name.");
      if (target.id === identity.profileId)
        throw new ApiFailure(
          "invalid_request",
          "An account cannot report itself.",
        );

      // The account and the content are two things the caller said, and
      // nothing tied them together: a report naming one person and pointing at
      // somebody else's post would reach moderation looking like theirs. The
      // row has to exist, be of the kind claimed, and belong to the account
      // named, or there is nothing here to report.
      if (contentId) {
        const { table, owner } = WHERE[kind];
        const { rows: found } = await client.query(
          `select 1 from public.${table} where id = $1 and ${owner} = $2`,
          [contentId, target.id],
        );
        if (!found[0])
          throw new ApiFailure(
            "not_found",
            `No ${kind.toLowerCase().replace("_", " ")} of theirs with that id.`,
          );
      }

      const { rows } = await client.query<{ id: string }>(
        `insert into public.reports
           (reporter_id, target_profile_id, content_type, content_id, reason,
            details)
         values ($1, $2, $3, $4, $5::public."ReportReason", $6)
         returning id`,
        [
          identity.profileId,
          target.id,
          kind,
          contentId,
          reason,
          optionalText(body, "details", 1000),
        ],
      );
      return { data: { id: rows[0].id, received: true } };
    });
  },
});
