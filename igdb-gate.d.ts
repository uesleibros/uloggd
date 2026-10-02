export type IgdbLease = { at: number; release: () => void };
export function createIgdbGate(options?: {
  limit?: number;
  windowMs?: number;
  concurrency?: number;
  maxQueue?: number;
  maxWaitMs?: number;
  maxLeaseMs?: number;
  now?: () => number;
}): {
  acquire: (key: string) => Promise<IgdbLease>;
  release: (key: string) => void;
  cancel: (key: string) => void;
  cancelOwner: (prefix: string, includeActive?: boolean) => void;
  hold: (ms: number) => void;
};
