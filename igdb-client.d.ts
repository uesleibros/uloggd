export function createIgdbClient(options?: { limit?: number }): {
  acquire(): Promise<() => void>;
  hold(ms: number): void;
};
