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

/**
 * What each activity is worth, mirroring `public.profile_xp_rates()`.
 *
 * `per` is how many of the thing make that much XP. Only the library uses
 * anything but 1: a game is a quarter of a point, written as one point per
 * four games so the arithmetic stays in integers rather than showing anyone a
 * total like 193.75.
 */
export const XP_RATES = {
  reviews: { xp: 5, per: 1 },
  journeys: { xp: 3, per: 1 },
  lists: { xp: 3, per: 1 },
  sessions: { xp: 2, per: 1 },
  screenshots: { xp: 2, per: 1 },
  comments: { xp: 1, per: 1 },
  games: { xp: 1, per: 4 },
} as const;

/**
 * XP a count of one activity is worth.
 *
 * Floors before multiplying, the same way the database does: four games make a
 * point and three make none. Rounding instead would let the dialog claim a
 * point the level was never given.
 */
export function xpFor(activity: keyof typeof XP_RATES, count: number) {
  const rate = XP_RATES[activity];
  return Math.floor(count / rate.per) * rate.xp;
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
