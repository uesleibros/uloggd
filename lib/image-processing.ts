const maxConcurrent = Number(process.env.IMAGE_PROCESSING_CONCURRENCY) || 2;
const defaultMaxQueued = Number(process.env.IMAGE_PROCESSING_QUEUE) || 8;
const sharpConcurrency = Number(process.env.SHARP_CONCURRENCY) || 2;

type Waiter = { resolve: () => void; settled: boolean };

let active = 0;
const waiting: Waiter[] = [];

export class ImageProcessingBusyError extends Error {
  constructor() {
    super("image processing queue is full");
    this.name = "ImageProcessingBusyError";
  }
}

function handOff() {
  while (waiting.length > 0) {
    const next = waiting.shift();
    if (next && !next.settled) {
      next.settled = true;
      next.resolve();
      return true;
    }
  }
  return false;
}

export type ImageSlotOptions = {
  timeoutMs?: number;
  maxQueued?: number;
};

export async function acquireImageSlot({
  timeoutMs,
  maxQueued = defaultMaxQueued,
}: ImageSlotOptions = {}): Promise<() => void> {
  if (active < maxConcurrent) {
    active += 1;
  } else if (waiting.length >= maxQueued) {
    throw new ImageProcessingBusyError();
  } else {
    await new Promise<void>((resolve, reject) => {
      const waiter: Waiter = { settled: false, resolve };
      waiting.push(waiter);
      if (timeoutMs === undefined) return;
      const timer = setTimeout(() => {
        if (waiter.settled) return;
        waiter.settled = true;
        reject(new ImageProcessingBusyError());
      }, timeoutMs);
      waiter.resolve = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (!handOff()) active -= 1;
  };
}

let configured = false;

export async function loadSharp() {
  const { default: sharp } = await import("sharp");
  if (!configured) {
    configured = true;
    sharp.concurrency(sharpConcurrency);
  }
  return sharp;
}
