import type { UiLang } from "@/lib/ui-text";

/** How many images one journal entry may carry, mirrored by the write RPCs. */
export const JOURNAL_IMAGE_LIMIT = 12;

/** How many entries one day of one game may hold, mirrored by `save_diary_entry`. */
export const JOURNAL_DAY_ENTRY_LIMIT = 24;

/**
 * `diary_entries.started_at` is a wall clock time with no date and no zone 
 * the hour the player says the session happened. Formatting it through a real
 * Date would drag the viewer's timezone into it and shift the hour, so the
 * parts are read straight off the stored value.
 */
export function formatEntryTime(
  value: string | null | undefined,
  lang: UiLang,
) {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, hours, minutes] = match;
  return new Intl.DateTimeFormat(lang, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, 0, 1, Number(hours), Number(minutes))));
}

/** The `HH:MM` shape an `<input type="time">` expects, or "" when unset. */
export function entryTimeInputValue(value: string | null | undefined) {
  const match = /^(\d{2}:\d{2})/.exec(value ?? "");
  return match ? match[1] : "";
}

/**
 * Day order inside the journal: timed entries first, in clock order, then the
 * untimed ones in the order they were written.
 */
export function compareEntriesWithinDay(
  a: { startedAt?: string | null; createdAt?: string | null },
  b: { startedAt?: string | null; createdAt?: string | null },
) {
  if (a.startedAt && b.startedAt) {
    const byClock = a.startedAt.localeCompare(b.startedAt);
    if (byClock) return byClock;
  } else if (a.startedAt !== b.startedAt) {
    return a.startedAt ? -1 : 1;
  }
  return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
}
