import { acquireImageSlot, loadSharp } from "@/lib/image-processing";
import { verdictFor } from "@/lib/image-sensitivity";
import { screeningViews, SCREENING_INPUT } from "@/lib/server-image-views";

const MAX_PIXELS = 40_000_000;

type Model = Awaited<ReturnType<(typeof import("nsfwjs"))["load"]>>;
let modelPromise: Promise<Model> | null = null;

async function loadModel() {
  if (!modelPromise)
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.setBackend("cpu");
      await tf.ready();
      const nsfw = await import("nsfwjs");
      return nsfw.load("MobileNetV2");
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  return modelPromise;
}

async function classifyNormalizedImage(processed: Buffer) {
  const tf = await import("@tensorflow/tfjs");
  const model = await loadModel();
  for await (const raw of screeningViews(processed)) {
    const image = tf.tensor3d(
      Int32Array.from(raw),
      [SCREENING_INPUT, SCREENING_INPUT, 3],
      "int32",
    );
    try {
      const predictions = await model.classify(image);
      const classes = new Set<string>(
        predictions.map((prediction) => prediction.className),
      );
      if (
        predictions.length !== 5 ||
        classes.size !== 5 ||
        !["Porn", "Hentai", "Sexy", "Neutral", "Drawing"].every((name) =>
          classes.has(name),
        ) ||
        predictions.some(
          ({ probability }) =>
            !Number.isFinite(probability) || probability < 0 || probability > 1,
        )
      ) {
        throw new Error("invalid image screening predictions");
      }
      const verdict = verdictFor(predictions);
      if (verdict.sensitive) return verdict;
    } finally {
      image.dispose();
    }
  }
  return { sensitive: false, reason: null, checked: true };
}

/** Classify the exact bytes that an upload route is about to publish. */
export async function classifyPublishedImage(processed: Buffer) {
  const release = await acquireImageSlot({ timeoutMs: 2000, maxQueued: 2 });
  try {
    return await classifyNormalizedImage(processed);
  } finally {
    release();
  }
}

export class InvalidProfileImageError extends Error {}

/** Decode once, publish only the normalized bytes that were classified. */
export async function screenProfileImage(
  input: Buffer,
  kind: "avatar" | "banner",
) {
  const release = await acquireImageSlot({ timeoutMs: 2000, maxQueued: 2 });
  try {
    const sharp = await loadSharp();
    let processed: Buffer;
    try {
      const source = sharp(input, {
        failOn: "warning",
        limitInputPixels: MAX_PIXELS,
        sequentialRead: true,
      });
      const metadata = await source.metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        (metadata.pages ?? 1) !== 1 ||
        !["jpeg", "png", "webp", "gif", "avif"].includes(metadata.format ?? "")
      )
        throw new InvalidProfileImageError("unsupported or animated image");

      const maxWidth = kind === "avatar" ? 640 : 1800;
      const maxHeight = kind === "avatar" ? 640 : 600;
      processed = await source
        .rotate()
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 86, effort: 5 })
        .toBuffer();
    } catch {
      throw new InvalidProfileImageError("image could not be decoded");
    }
    return { processed, verdict: await classifyNormalizedImage(processed) };
  } finally {
    release();
  }
}
