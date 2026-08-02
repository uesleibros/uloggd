import type { SupabaseClient } from "@supabase/supabase-js";

/** One profile's standing, as returned by the `profile_level` function. */
export type ProfileLevel = {
  level: number;
  xp: number;
  level_floor: number;
  next_level_at: number;
  sessions: number;
  reviews: number;
  journeys: number;
  lists: number;
  screenshots: number;
  comments: number;
  games: number;
  /** The part of the library the level is standing on, once the cap applies. */
  games_scored: number;
};

/** How many quarter points make one XP, mirroring `profile_xp_quarters()`. */
export const XP_QUARTERS = 4;

/**
 * What each activity is worth, in quarter points, mirroring
 * `public.profile_xp_rates()`.
 *
 * Quarters rather than fractions because fractional XP would show someone a
 * total of 193.75 and then round it for display, so the number shown and the
 * number scored would stop being the same one.
 */
export const XP_RATES = {
  reviews: 4,
  journeys: 3,
  lists: 3,
  sessions: 2,
  screenshots: 2,
  comments: 1,
  games: 1,
} as const;

/** What one of an activity is worth in whole XP, for printing a rate. */
export function xpRate(activity: keyof typeof XP_RATES) {
  return XP_RATES[activity] / XP_QUARTERS;
}

/**
 * XP a count of one activity is worth, as a decimal.
 *
 * Not floored, because the database sums every activity in quarters and
 * divides once at the end. Flooring each row here would report a total the
 * level was never given, and would claim three lists are worth nothing.
 */
export function xpFor(activity: keyof typeof XP_RATES, count: number) {
  return (count * XP_RATES[activity]) / XP_QUARTERS;
}

/**
 * How far through the current level, from 0 to 1.
 *
 * Guards the denominator: the width is a difference between two values the
 * database hands over together, and a zero one would divide an empty ring by
 * nothing rather than drawing it empty.
 */
export function levelProgress(standing: {
  xp: number;
  level_floor: number;
  next_level_at: number;
}) {
  const width = standing.next_level_at - standing.level_floor;
  if (width <= 0) return 0;
  const into = standing.xp - standing.level_floor;
  return Math.min(1, Math.max(0, into / width));
}

/** XP still to earn before the next level. */
export function xpToNextLevel(standing: { xp: number; next_level_at: number }) {
  return Math.max(0, standing.next_level_at - standing.xp);
}

/**
 * Reads levels for a whole page of names at once.
 *
 * Keyed by profile id, so a caller that walks rows can look each author up
 * without caring how many times the same one appeared. An empty input skips
 * the request rather than asking the database about nothing.
 */
export async function getProfileLevels(
  supabase: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, ProfileLevel>> {
  const wanted = [...new Set(profileIds.filter(Boolean))];
  if (!wanted.length) return new Map();
  const { data, error } = await supabase.rpc("profile_levels", {
    targets: wanted,
  });
  if (error || !data) return new Map();
  return new Map(
    (data as (ProfileLevel & { profile_id: string })[]).map((row) => [
      row.profile_id,
      row,
    ]),
  );
}

/**
 * Reads a profile's level.
 *
 * Returns null rather than throwing: the level is decoration on a page that
 * has to render regardless, so a failure here should cost the badge and
 * nothing else.
 */
export async function getProfileLevel(
  supabase: SupabaseClient,
  profileId: string,
): Promise<ProfileLevel | null> {
  const { data, error } = await supabase.rpc("profile_level", {
    target: profileId,
  });
  if (error || !data?.length) return null;
  return data[0] as ProfileLevel;
}
