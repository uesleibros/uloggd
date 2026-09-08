import "server-only";

export type TierlistTier = {
  id: string;
  label: string;
  color: string;
  position: number;
};

export type TierlistGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string;
  fallbackUrl: string;
  releaseTimestamp: number | null;
};

export type TierlistItem = TierlistGame & { tierId: string; position: number };

export type TierlistData = {
  tiers: TierlistTier[];
  items: TierlistItem[];
  /** Owner's library games not placed in any tier, the editor's pool. */
  pool: TierlistGame[];
  /** Distinct games actually shown, after the library filter. */
  rankedCount: number;
};
