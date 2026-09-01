const maxConcurrent = Number(process.env.IMAGE_PROCESSING_CONCURRENCY) || 2;
const maxQueued = Number(process.env.IMAGE_PROCESSING_QUEUE) || 8;
const sharpConcurrency = Number(process.env.SHARP_CONCURRENCY) || 2;

let active = 0;
const waiting: Array<() => void> = [];

export class ImageProcessingBusyError extends Error {
  constructor() {
    super("image processing queue is full");
    this.name = "ImageProcessingBusyError";
  }
}

export async function acquireImageSlot(): Promise<() => void> {
  if (active < maxConcurrent) {
    active += 1;
  } else if (waiting.length >= maxQueued) {
    throw new ImageProcessingBusyError();
  } else {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
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
