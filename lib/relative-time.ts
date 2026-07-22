import type { UiLang } from "./ui-text";

const UNITS = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4.345, "week"],
  [12, "month"],
  [Number.POSITIVE_INFINITY, "year"],
] as const;

/** One relative-time policy for every piece of community chronology. */
export function formatRelativeTime(
  value: string | Date,
  lang: UiLang,
  now = Date.now(),
) {
  let amount = (new Date(value).getTime() - now) / 1000;
  let unit: Intl.RelativeTimeFormatUnit = "second";

  for (const [limit, nextUnit] of UNITS) {
    unit = nextUnit;
    if (Math.abs(amount) < limit) break;
    amount /= limit;
  }

  return new Intl.RelativeTimeFormat(lang, { numeric: "always" }).format(
    Math.round(amount),
    unit,
  );
}
