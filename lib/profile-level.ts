import type { SupabaseClient } from "@supabase/supabase-js";

/** Activities that earn XP, as named by `public.profile_xp_rates()`. */
export type XpActivity =
  "REVIEW" | "JOURNEY" | "LIST" | "SESSION" | "SCREENSHOT" | "COMMENT" | "GAME";

/**
 * One line of the breakdown, exactly as the database scored it.
 *
 * `count` is what someone has and `scored` is what counted, which differ only
 * for a library past its cap. `tenths` is the rate and `earned_tenths` what
 * the line contributed, both in tenths of a point so nothing is rounded before
 * the total is.
 *
 * This replaces a copy of the rates that lived here. That copy went stale
 * twice while the numbers were being tuned, and the dialog explained a scheme
 * the database had stopped using; a test caught it both times, which is the
 * point at which duplication should stop rather than be watched.
 */
export type XpSource = {
  activity: XpActivity;
  count: number;
  scored: number;
  tenths: number;
  earned_tenths: number;
};

/** One profile's standing, as returned by the `profile_level` function. */
export type ProfileLevel = {
  level: number;
  xp: number;
  level_floor: number;
  next_level_at: number;
  sources: XpSource[];
};

/** How many tenths make one XP, mirroring `profile_xp_tenths()`. */
export const XP_TENTHS = 10;

/** Tenths as a readable number of points, for printing a rate or a subtotal. */
export function points(tenths: number) {
  return tenths / XP_TENTHS;
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
