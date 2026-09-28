import type { UiLang } from "@/lib/ui-text";

/**
 * Dates, written the same way on every screen.
 *
 * Eighteen files built an `Intl.DateTimeFormat` of their own, most of them
 * asking for the very same three fields, and the option object was the only
 * thing standing between a release date and the day before it: a stored
 * calendar day formatted without `timeZone: "UTC"` shifts backwards for
 * everyone west of Greenwich, and the site had both kinds spelled out by
 * hand, in the same file, one line apart.
 *
 * So the choice is made once, here, and it is made by what the value is
 * rather than by what a screen felt like typing:
 *
 * - `calendarDate` is for a day that belongs to nobody's clock: the day a
 *   game came out, the day somebody played. It reads the same in São Paulo
 *   and in Tokyo, because it is the same day.
 * - `localDate` is for a moment that happened: a session signed in, a
 *   transaction cleared. That one belongs in the reader's own zone.
 *
 * Both memoise their formatter. Building one is not free, and several of
 * these are used once per row.
 */

const STYLES = {
  /** `5 de fev. de 2026` */
  short: { day: "numeric", month: "short", year: "numeric" },
  /** `05 de fev. de 2026`, when a column of them should line up. */
  shortPadded: { day: "2-digit", month: "short", year: "numeric" },
  /** `5 de fevereiro de 2026` */
  long: { day: "numeric", month: "long", year: "numeric" },
  /** `quinta-feira, 5 de fevereiro de 2026` */
  withWeekday: {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  },
  /** `5 de fev.`, for a date whose year is already understood. */
  dayMonth: { day: "numeric", month: "short" },
  /** `05 de fev.` */
  dayMonthPadded: { day: "2-digit", month: "short" },
  /** `fevereiro de 2026` */
  monthYear: { month: "long", year: "numeric" },
  /** `fev.` */
  month: { month: "short" },
  /** `S`, for a calendar's column headings. */
  weekdayNarrow: { weekday: "narrow" },
  /** `05:42`, for a moment on a day already named. */
  time: { hour: "2-digit", minute: "2-digit" },
  /** `5 de fev., 05:42` */
  dayMonthTime: {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof STYLES;

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(lang: UiLang, style: DateStyle, utc: boolean) {
  const key = `${lang}|${style}|${utc}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const made = new Intl.DateTimeFormat(lang, {
    ...STYLES[style],
    ...(utc ? { timeZone: "UTC" } : {}),
  });
  cache.set(key, made);
  return made;
}

/** The formatter itself, for a loop that would otherwise look one up a row. */
export function calendarFormatter(lang: UiLang, style: DateStyle = "short") {
  return formatter(lang, style, true);
}

export function localFormatter(lang: UiLang, style: DateStyle = "short") {
  return formatter(lang, style, false);
}

type DateInput = Date | string | number;

/** `2026-02-05` and a `Date` both mean the fifth, so both arrive as UTC. */
function asDate(value: DateInput) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value);
}

/** A day that is the same day everywhere: released on, played on, born on. */
export function calendarDate(
  value: DateInput,
  lang: UiLang,
  style: DateStyle = "short",
) {
  return calendarFormatter(lang, style).format(asDate(value));
}

/** A moment that happened, told in the reader's own time zone. */
export function localDate(
  value: DateInput,
  lang: UiLang,
  style: DateStyle = "short",
) {
  return localFormatter(lang, style).format(asDate(value));
}

/** Seconds since the epoch, which is how the catalogue gives release dates. */
export function calendarDateFromSeconds(
  seconds: number,
  lang: UiLang,
  style: DateStyle = "short",
) {
  return calendarDate(seconds * 1000, lang, style);
}
