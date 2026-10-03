import { acquireImageSlot, loadSharp } from "./image-processing";

export type UserImageKind = "avatar" | "banner" | "screenshot" | "journal";
export const MAX_IMAGE_INPUT_BYTES = 15 * 1024 * 1024;
export const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
export const IMAGE_PRESETS = {
  avatar: {
    width: 512,
    height: 512,
    target: 100 * 1024,
    hard: 500 * 1024,
    animatedHard: 4 * 1024 * 1024,
    duration: 15_000,
  },
  banner: {
    width: 1600,
    height: 600,
    target: 320 * 1024,
    hard: 1024 * 1024,
    animatedHard: 6 * 1024 * 1024,
    duration: 20_000,
  },
  screenshot: {
    width: 1920,
    height: 1080,
    target: 650 * 1024,
    hard: 2 * 1024 * 1024,
    animatedHard: 0,
    duration: 0,
  },
  journal: {
    width: 1920,
    height: 1080,
    target: 650 * 1024,
    hard: 2 * 1024 * 1024,
    animatedHard: 0,
    duration: 0,
  },
} as const;
export const AVIF_QUALITIES = [58, 54, 50, 46] as const;
export const WEBP_QUALITIES = [82, 78, 75] as const;
export const AVIF_EFFORT = 3;
export const WEBP_EFFORT = 4;
export class InvalidUserImageError extends Error {}

function isAnimatedPng(input: Buffer) {
  for (let offset = 8; offset + 12 <= input.length;) {
    const length = input.readUInt32BE(offset);
    if (offset + 12 + length > input.length) return false;
    if (input.toString("ascii", offset + 4, offset + 8) === "acTL") return true;
    offset += length + 12;
  }
  return false;
}

export type ProcessedUserImage = {
  buffer: Buffer;
  extension: "avif" | "webp";
  contentType: "image/avif" | "image/webp";
  width: number;
  height: number;
  animated: boolean;
  frames: number;
  originalBytes: number;
  optimizedBytes: number;
  compressionRatio: number;
  processingMs: number;
};

/** Only the semaphore owner calls this; inference and encoding can share one slot. */
export async function processUserImageInSlot(
  input: Buffer,
  kind: UserImageKind,
  mime?: string,
): Promise<ProcessedUserImage> {
  const started = performance.now();
  if (!input.length || input.length > MAX_IMAGE_INPUT_BYTES)
    throw new InvalidUserImageError("image exceeds input limit");
  const sharp = await loadSharp();
  try {
    const source = sharp(input, {
      failOn: "warning",
      limitInputPixels: 40_000_000,
      sequentialRead: true,
      animated: true,
    });
    const metadata = await source.metadata();
    const frames = metadata.pages ?? 1;
    const width = metadata.width ?? 0;
    const height = metadata.pageHeight ?? metadata.height ?? 0;
    const avif = metadata.format === "heif" && metadata.compression === "av1";
    const realMime = avif ? "image/avif" : `image/${metadata.format}`;
    if (
      !width ||
      !height ||
      !IMAGE_MIME_TYPES.has(realMime) ||
      (mime && mime !== realMime) ||
      frames > 300 ||
      width * height * frames > 40_000_000
    )
      throw new InvalidUserImageError(
        "unsupported image or pixel/frame limit exceeded",
      );
    // libvips cannot decode AVIF sequences or APNG reliably in this build. Never flatten them silently.
    if (
      frames === 1 &&
      ((avif && input.subarray(0, 64).includes(Buffer.from("avis"))) ||
        (metadata.format === "png" && isAnimatedPng(input)))
    )
      throw new InvalidUserImageError("unsupported animation sequence");
    const animated = frames > 1;
    const preset = IMAGE_PRESETS[kind];
    const delay = metadata.delay;
    if (
      animated &&
      (!preset.animatedHard ||
        !delay ||
        delay.length !== frames ||
        delay.some((ms) => !Number.isFinite(ms) || ms <= 0) ||
        delay.reduce((a, b) => a + b, 0) > preset.duration)
    )
      throw new InvalidUserImageError(
        "animation unsupported or exceeds duration limit",
      );
    // Raw resized pixels avoid decoding the original on each quality step. Sharp handles per-frame resizing.
    const oriented = animated ? source : source.rotate();
    const resized = await oriented
      .resize({
        width: preset.width,
        height: preset.height,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pageHeight = resized.info.pageHeight ?? resized.info.height;
    const qualities = animated ? WEBP_QUALITIES : AVIF_QUALITIES;
    const hard = animated ? preset.animatedHard : preset.hard;
    let output: Buffer | undefined;
    for (const quality of qualities) {
      const encoder = sharp(resized.data, {
        raw: {
          width: resized.info.width,
          height: resized.info.height,
          channels: resized.info.channels,
          ...(animated ? { pageHeight } : {}),
        },
      });
      output = await (
        animated
          ? encoder.webp({
              quality,
              effort: WEBP_EFFORT,
              alphaQuality: 100,
              smartSubsample: true,
              delay,
              loop: metadata.loop ?? 0,
            })
          : encoder.avif({
              quality,
              effort: AVIF_EFFORT,
              chromaSubsampling: "4:4:4",
            })
      ).toBuffer();
      if (output.length <= (animated ? hard : preset.target)) break;
    }
    if (!output || output.length > hard)
      throw new InvalidUserImageError("optimized image exceeds hard limit");
    const final = await sharp(output).metadata();
    if (
      (final.pages ?? 1) !== frames ||
      (animated &&
        (JSON.stringify(final.delay) !== JSON.stringify(delay) ||
          (final.loop ?? 0) !== (metadata.loop ?? 0)))
    )
      throw new InvalidUserImageError("animation could not be preserved");
    const result: ProcessedUserImage = {
      buffer: output,
      extension: animated ? "webp" : "avif",
      contentType: animated ? "image/webp" : "image/avif",
      width: final.width!,
      height: final.pageHeight ?? final.height!,
      animated,
      frames,
      originalBytes: input.length,
      optimizedBytes: output.length,
      compressionRatio: output.length / input.length,
      processingMs: Math.round(performance.now() - started),
    };
    console.info("media.process.complete", {
      type: kind,
      ...result,
      buffer: undefined,
    });
    return result;
  } catch (error) {
    if (error instanceof InvalidUserImageError) throw error;
    throw new InvalidUserImageError("image could not be decoded");
  }
}
export async function processUserImage(
  input: Buffer,
  kind: UserImageKind,
  mime?: string,
) {
  const release = await acquireImageSlot({ timeoutMs: 2000, maxQueued: 2 });
  try {
    return await processUserImageInSlot(input, kind, mime);
  } finally {
    release();
  }
}
