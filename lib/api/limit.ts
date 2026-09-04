import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateBucket = "read" | "write" | "catalog";

const CEILING: Record<RateBucket, number> = {
  read: 600,
  write: 60,
  catalog: 1000,
};

const WINDOW = "1 hour";

export type RateVerdict = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
};

type ClaimRow = { allowed: boolean; remaining: number; reset_at: string };

export async function claimRate(
  keyId: string,
  bucket: RateBucket,
): Promise<RateVerdict> {
  const { data, error } = await createAdminClient().rpc(
    "claim_api_rate_limit",
    {
      key_ref: keyId,
      bucket_name: bucket,
      allowance: CEILING[bucket],
      window_size: WINDOW,
    },
  );
  const row = ((data ?? []) as ClaimRow[])[0];
  if (error || !row) throw new Error("rate limit unavailable");

  return {
    allowed: row.allowed,
    limit: CEILING[bucket],
    remaining: row.remaining,
    resetAt: new Date(row.reset_at),
  };
}

export function rateHeaders(verdict: RateVerdict): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(verdict.limit),
    "X-RateLimit-Remaining": String(verdict.remaining),
    "X-RateLimit-Reset": String(Math.floor(verdict.resetAt.getTime() / 1000)),
  };
}

export function retryAfterSeconds(verdict: RateVerdict) {
  return Math.max(
    1,
    Math.ceil((verdict.resetAt.getTime() - Date.now()) / 1000),
  );
}
