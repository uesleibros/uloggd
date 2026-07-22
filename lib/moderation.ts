export const MODERATION_REPORT_STATUSES = [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
  "ALL",
] as const;

export type ModerationStatus = (typeof MODERATION_REPORT_STATUSES)[number];

export function isModerationStatus(value: string): value is ModerationStatus {
  return (MODERATION_REPORT_STATUSES as readonly string[]).includes(value);
}

export const MODERATION_PAGE_SIZE = 40;
export const MODERATION_AUDIT_PAGE_SIZE = 30;

export const MODERATION_BAN_DURATIONS = [
  { value: "1", days: 1 },
  { value: "7", days: 7 },
  { value: "30", days: 30 },
] as const;

export const MODERATION_CONTENT_TYPES = [
  "PROFILE",
  "PROFILE_COMMENT",
  "SCREENSHOT",
] as const;

export type ModerationContentType = (typeof MODERATION_CONTENT_TYPES)[number];
