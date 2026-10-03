import { acquireImageSlot, loadSharp } from "@/lib/image-processing";
import { verdictFor } from "@/lib/image-sensitivity";
import { screeningViews, SCREENING_INPUT } from "@/lib/server-image-views";
import { createHash } from "node:crypto";
import { join, sep } from "node:path";

const MAX_PIXELS = 40_000_000;

type Model = Awaited<ReturnType<(typeof import("nsfwjs"))["load"]>>;
let modelPromise: Promise<Model> | null = null;
type Verdict = Awaited<ReturnType<typeof classifyAnimation>>;
const verifiedImages = new Map<string, { verdict: Verdict; expires: number }>();
const analyses = new Map<string, Promise<Verdict>>();

/** Only verdicts computed here are reusable. Client predictions are never trusted. */
async function verifiedVerdict(processed: Buffer): Promise<Verdict> {
  const key = createHash("sha256").update(processed).digest("hex");
  const cached = verifiedImages.get(key);
  if (cached && cached.expires > Date.now()) {
    verifiedImages.delete(key);
    verifiedImages.set(key, cached);
    return cached.verdict;
  }
  const pending = analyses.get(key);
  if (pending) return pending;
  const analysis = classifyAnimation(processed)
    .then((verdict) => {
      verifiedImages.set(key, {
        verdict,
        expires: Date.now() + 15 * 60 * 1000,
      });
      while (verifiedImages.size > 512)
        verifiedImages.delete(verifiedImages.keys().next().value!);
      return verdict;
    })
    .finally(() => analyses.delete(key));
  analyses.set(key, analysis);
  return analysis;
}

async function loadModel() {
  if (!modelPromise)
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      if (process.env.NODE_ENV === "production") tf.enableProdMode();
      // SIMD inference avoids the slow JavaScript CPU backend and native addons.
      const wasm = await import("@tensorflow/tfjs-backend-wasm");
      wasm.setWasmPaths(
        join(
          process.cwd(),
          "node_modules",
          "@tensorflow",
          "tfjs-backend-wasm",
          "dist",
        ) + sep,
      );
      wasm.setThreadsCount(2);
      if (!(await tf.setBackend("wasm")))
        throw new Error("image screening backend unavailable");
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

/** Inspect every published frame, including frames too brief to notice manually. */
async function classifyAnimation(processed: Buffer) {
  const sharp = await loadSharp();
  const metadata = await sharp(processed).metadata();
  const pages = metadata.pages ?? 1;
  if (
    !metadata.width ||
    !metadata.height ||
    pages > 300 ||
    metadata.width * metadata.height > MAX_PIXELS
  )
    throw new InvalidProfileImageError("image or animation too large");
  if (pages === 1) return classifyNormalizedImage(processed);
  const seen = new Set<string>();
  for (let page = 0; page < pages; page += 1) {
    const frame = await sharp(processed, {
      page,
      pages: 1,
      limitInputPixels: MAX_PIXELS,
    })
      .png()
      .toBuffer();
    const digest = createHash("sha256").update(frame).digest("hex");
    if (seen.has(digest)) continue;
    seen.add(digest);
    const verdict = await classifyNormalizedImage(frame);
    if (verdict.sensitive) return verdict;
  }
  return { sensitive: false, reason: null, checked: true };
}

/** Classify the exact bytes that an upload route is about to publish. */
export async function classifyPublishedImage(processed: Buffer) {
  const release = await acquireImageSlot({ timeoutMs: 2000, maxQueued: 2 });
  try {
    return await verifiedVerdict(processed);
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
        animated: true,
      });
      const metadata = await source.metadata();
      if (
        !metadata.width ||
        !metadata.height ||
        (metadata.pages ?? 1) > 300 ||
        metadata.width * metadata.height > MAX_PIXELS ||
        !["jpeg", "png", "webp", "gif", "avif"].includes(metadata.format ?? "")
      )
        throw new InvalidProfileImageError(
          "unsupported image or animation too large",
        );

      const maxWidth = kind === "avatar" ? 640 : 1800;
      const maxHeight = kind === "avatar" ? 640 : 600;
      // Animated formats have a vertical frame strip; Sharp resizes each frame.
      // Auto rotation is only supported for single-page inputs.
      const oriented = (metadata.pages ?? 1) > 1 ? source : source.rotate();
      processed = await oriented
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 86, effort: 3 })
        .toBuffer();
      if (processed.length > 8 * 1024 * 1024)
        throw new InvalidProfileImageError("normalized image too large");
    } catch {
      throw new InvalidProfileImageError("image could not be decoded");
    }
    return { processed, verdict: await verifiedVerdict(processed) };
  } finally {
    release();
  }
}
