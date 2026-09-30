/** The documentation and enforcement read the same quotas. */
export const RATE_CEILINGS = {
  read: 600,
  write: 60,
  catalog: 1000,
} as const;

export type RateBucket = keyof typeof RATE_CEILINGS;
