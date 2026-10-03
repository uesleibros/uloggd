/** Bounded process work for the persistent cluster. No request APIs or Next after context. */
export function createCatalogBackgroundQueue(limit = 4, maxQueued = 64) {
  let active = 0;
  const queue: (() => Promise<void>)[] = [];
  function pump() {
    while (active < limit && queue.length) {
      active++;
      const task = queue.shift()!;
      void Promise.resolve()
        .then(task)
        .catch(() => {})
        .finally(() => {
          active--;
          pump();
        });
    }
  }
  return (task: () => Promise<void>) => {
    if (queue.length >= maxQueued)
      throw new Error("catalogue background queue full");
    queue.push(task);
    setImmediate(pump);
  };
}
