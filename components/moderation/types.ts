/**
 * The shapes the console passes around.
 *
 * In one file because four components share them, and because the console used
 * to declare them inline next to fifteen hundred lines of markup, where the
 * only way to know what a `Report` was was to scroll.
 */

export type ModerationRole = "USER" | "MODERATOR" | "ADMIN";

export type ModerationProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: ModerationRole;
  verified: boolean;
  account_type: "PERSON" | "ORGANIZATION";
  created_at: string;
};

export type ModerationReport = {
  id: string;
  reporter_id: string;
  target_profile_id: string | null;
  content_type: string | null;
  content_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  moderator_note: string | null;
  reviewed_at: string | null;
};

export type ModerationBan = {
  profile_id: string;
  banned_at: string;
  banned_until: string | null;
  reason: string;
};

export type ModerationAction = {
  id: string;
  moderator_id: string;
  target_profile_id: string | null;
  action: string;
  reason: string | null;
  created_at: string;
  metadata: unknown;
};

export type ModerationComment = {
  id: string;
  body: string;
  deleted_at: string | null;
};

export type ModerationScreenshot = {
  id: string;
  publicId: string;
  description: string | null;
  igdbId: number;
  gameSlug: string;
  width: number;
  height: number;
  containsSpoilers: boolean;
  deletedAt: string | null;
  imageUrl: string | null;
};

/** What the profile dialog is about to do. */
export type ProfileAction =
  "BAN" | "UNBAN" | "VERIFY" | "UNVERIFY" | "DEMOTE_ORGANIZATION";

/** What the removal dialog is about to take down. */
export type Removal =
  | {
      kind: "COMMENT";
      table: "PROFILE_COMMENT" | "CONTENT_COMMENT";
      reportId: string;
      commentId: string;
    }
  | { kind: "SCREENSHOT"; reportId: string; screenshotId: string };
