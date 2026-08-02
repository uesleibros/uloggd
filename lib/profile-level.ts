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
  games: number;
};

/** What each activity is worth, mirroring `public.profile_xp_rates()`. */
export const XP_RATES = {
  sessions: 10,
  reviews: 25,
  journeys: 12,
  lists: 15,
  screenshots: 8,
  games: 1,
} as const;

/**
 * How far through the current level, from 0 to 1.
 *
 * Guards the denominator because level 0 sits on a floor of 0, and a profile
 * with no activity at all would otherwise divide by its own width of 50 with a
 * numerator of 0, which is fine, and a hypothetical equal pair, which is not.
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
