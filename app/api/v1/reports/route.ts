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
 * the people who handle them, and letting the reporter watch its progress —
 * or letting anyone count how often an account has been reported — turns the
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
      const { rows: found } = await client.query<{ id: string }>(
        "select id from public.profiles where lower(username) = lower($1)",
        [username],
      );
      if (!found[0])
        throw new ApiFailure("not_found", "No account with that name.");
      if (found[0].id === identity.profileId)
        throw new ApiFailure(
          "invalid_request",
          "An account cannot report itself.",
        );

      const { rows } = await client.query<{ id: string }>(
        `insert into public.reports
           (reporter_id, target_profile_id, content_type, content_id, reason,
            details)
         values ($1, $2, $3, $4, $5::public."ReportReason", $6)
         returning id`,
        [
          identity.profileId,
          found[0].id,
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
