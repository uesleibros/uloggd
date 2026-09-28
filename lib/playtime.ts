import type { UiLang } from "@/lib/ui-text";

/**
 * How many minutes somebody played, written out.
 *
 * A number of minutes was turned into text in nine places and came out nine
 * ways: `2h 15min` on a run's page, `2h 15min` with a different space on the
 * profile, `2h 15m` over a game's logs, `2:15` in the calendar, `2h` in the
 * year in review. Two of them were the same function copied word for word
 * into two route files.
 *
 * There are three shapes here because three things are being said, not
 * because three screens each wanted their own:
 *
 * - `playtime` is the sentence form, for a length somebody reads: how long a
 *   session ran, how long a run took.
 * - `playtimeHours` is the headline form, for a total big enough that the
 *   leftover minutes are noise: a year, a shelf, a genre.
 * - `playtimeClock` is the running form, fixed width so it does not jitter
 *   while it ticks, and so a column of offsets lines up.
 */

/** `45 min`, `2h`, `2h 15min`. */
export function playtime(minutes: number) {
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!whole) return `${minutes} min`;
  if (!rest) return `${whole}h`;
  return `${whole}h ${rest}min`;
}

/**
 * `45 min`, `1.234h`. The hours carry the locale's thousands separator,
 * because this is the form a four-digit total shows up in.
 */
export function playtimeHours(minutes: number, lang: UiLang) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60).toLocaleString(lang)}h`;
}

/** `45m`, `1h 05m`: a clock that is still running, or an offset within one. */
export function playtimeClock(minutes: number) {
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return whole > 0 ? `${whole}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}

/**
 * The two boxes a length is typed into, as strings an input can hold.
 *
 * Empty rather than zero on either side: a box reading `0` invites somebody
 * to leave it there, and the two editors that ask this question had both
 * decided that the same way before they shared the decision.
 */
export function splitPlaytime(minutes: number) {
  return {
    hours: minutes >= 60 ? String(Math.floor(minutes / 60)) : "",
    minutes: minutes % 60 ? String(minutes % 60) : "",
  };
}

/**
 * `45m`, `1h`, `1:05`: the narrowest form, for a calendar cell that has one
 * line of room. Null for nothing played, which is not the same as zero.
 */
export function playtimeCell(minutes: number | null) {
  if (!minutes) return null;
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (whole > 0 && rest > 0) return `${whole}:${String(rest).padStart(2, "0")}`;
  if (whole > 0) return `${whole}h`;
  return `${rest}m`;
}
