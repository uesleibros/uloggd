import type { SupabaseClient } from "@supabase/supabase-js";

/** The six minerals, in the order they are shown and drawn. */
export type MineralKind =
  "COPPER" | "IRON" | "GOLD" | "EMERALD" | "DIAMOND" | "RUBY";

/**
 * One slot in a wallet.
 *
 * `weight` is the draw weight, carried so the interface can state the odds it
 * is actually playing rather than a copy of them that goes stale.
 */
export type MineralHolding = {
  mineral: MineralKind;
  amount: number;
  weight: number;
  rank: number;
};

/** Where each mineral's picture lives, from the old uloggd's own set. */
export const MINERAL_ART: Record<MineralKind, string> = {
  COPPER: "/minerals/copper.png",
  IRON: "/minerals/iron.png",
  GOLD: "/minerals/gold.png",
  EMERALD: "/minerals/emerald.png",
  DIAMOND: "/minerals/diamond.png",
  RUBY: "/minerals/ruby.png",
};

/**
 * The odds as a percentage, from the weight the database drew with.
 *
 * Derived rather than listed, so a rate change in the migration reaches the
 * interface without a second edit. The total is passed in because a single
 * holding cannot know it.
 */
export function mineralOdds(weight: number, totalWeight: number) {
  if (totalWeight <= 0) return 0;
  return (weight / totalWeight) * 100;
}

/**
 * How many minerals a wallet holds in total.
 *
 * One number, for the badge on the header button. Every mineral counts the
 * same here: the badge answers "is there anything in there", and weighing a
 * ruby against a lump of copper is the wallet page's job, not a chip's.
 */
export function totalMinerals(holdings: MineralHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.amount, 0);
}

/** Sums the draw weights, the denominator for the odds. */
export function totalWeight(holdings: MineralHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.weight, 0);
}

/**
 * Reads a profile's wallet, every mineral including the empty ones.
 *
 * Returns an empty list rather than throwing: the wallet decorates a page that
 * has to render regardless.
 */
export async function getProfileMinerals(
  supabase: SupabaseClient,
  profileId: string,
): Promise<MineralHolding[]> {
  const { data, error } = await supabase.rpc("profile_minerals", {
    target: profileId,
  });
  if (error || !data) return [];
  return data as MineralHolding[];
}
