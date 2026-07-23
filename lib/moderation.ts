/** Real values of reports.status. "ALL" is a view, not a status. */
export const MODERATION_REPORT_STATE_VALUES = [
  "OPEN",
  "REVIEWING",
  "RESOLVED",
  "DISMISSED",
] as const;

export const MODERATION_REPORT_STATUSES = [
  ...MODERATION_REPORT_STATE_VALUES,
  "ALL",
] as const;

export type ModerationStatus = (typeof MODERATION_REPORT_STATUSES)[number];

export function isModerationStatus(value: string): value is ModerationStatus {
  return (MODERATION_REPORT_STATUSES as readonly string[]).includes(value);
}

// Small enough that a page of reports reads as a queue instead of a wall. The
// counts moderators actually work from live in the status tabs, and everything
// past the first page is one click away.
export const MODERATION_PAGE_SIZE = 12;
export const MODERATION_AUDIT_PAGE_SIZE = 12;

/** 1-based, clamped to what the current result set can actually show. */
export function clampPage(raw: unknown, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const parsed = Number.parseInt(typeof raw === "string" ? raw : "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return { page: 1, pageCount };
  return { page: Math.min(parsed, pageCount), pageCount };
}

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
