import { createHash } from "node:crypto";
import type { ParsedAnubisChallenge } from "./parser";

const MAX_NONCE = 2_500_000;
const MAX_SOLVE_TIME_MS = 8_000;

export type AnubisProof = {
  hash: string;
  nonce: number;
  elapsedTime: number;
};

export function solveAnubisChallenge(
  challenge: ParsedAnubisChallenge,
): AnubisProof | null {
  const startedAt = Date.now();
  const prefix = "0".repeat(challenge.difficulty);
  for (let nonce = 0; nonce <= MAX_NONCE; nonce += 1) {
    const hash = createHash("sha256")
      .update(`${challenge.randomData}${nonce}`)
      .digest("hex");
    if (hash.startsWith(prefix))
      return {
        hash,
        nonce,
        elapsedTime: Math.max(1, Date.now() - startedAt),
      };
    if ((nonce & 4_095) === 0 && Date.now() - startedAt > MAX_SOLVE_TIME_MS)
      return null;
  }
  return null;
}
