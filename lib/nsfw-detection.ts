"use client";

import type { NSFWJS, PredictionType } from "nsfwjs";
import { verdictFor, type SensitivityResult } from "@/lib/image-sensitivity";

export { verdictFor } from "@/lib/image-sensitivity";

/**
 * Checks a picture for adult content before it is published.
 *
 * Runs in the browser, on the file someone picked, before anything leaves the
 * device. The image is not uploaded to a third party for this early check.
 * Profile images receive a separate server check on the final upload.
 *
 * What this is not: an enforcement boundary. The upload endpoint can be called
 * without this page, so anything decided here can be skipped by not running
 * it. Screenshots and journal images use its advisory result and remain
 * subject to reports and moderation.
 */

/**
 * Where the library comes from at runtime.
 *
 * Not bundled. TensorFlow and the model wrapper are several megabytes, and
 * bundling them has two costs: everyone who never posts a screenshot still
 * downloads them, and the production build could not be compiled at all on the
 * machine this is developed on, where the minifier gave out on the size.
 *
 * The dependency is already remote either way. `nsfwjs.load()` fetches the
 * model weights from a CDN, so a browser doing this check was always going to
 * make a third-party request; this makes the code travel the same way as the
 * weights rather than adding a new kind of dependency.
 *
 * `webpackIgnore` keeps the bundler from following these, which is what makes
 * them runtime URLs rather than build inputs.
 */
const TFJS_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm";
const NSFWJS_URL = "https://cdn.jsdelivr.net/npm/nsfwjs@4.3.0/+esm";

/**
 * The model, loaded once per page.
 *
 * Held as the promise rather than the result so two images picked in quick
 * succession share one load instead of racing to start two. Nothing is fetched
 * until somebody actually chooses a picture.
 */
let modelPromise: Promise<NSFWJS> | null = null;

async function loadModel() {
  if (!modelPromise)
    modelPromise = (async () => {
      // The backend has to register itself before the model is built, and
      // loading `nsfwjs` alone does not do it.
      await import(/* webpackIgnore: true */ TFJS_URL);
      const nsfwjs = (await import(
        /* webpackIgnore: true */ NSFWJS_URL
      )) as typeof import("nsfwjs");
      return nsfwjs.load();
    })().catch((reason) => {
      // Cleared so a transient failure (an offline first load, a blocked CDN)
      // can be retried on the next picture rather than poisoning the page.
      modelPromise = null;
      throw reason;
    });
  return modelPromise;
}

/** Decodes a file into an element the model can read, and cleans up after. */
/**
 * Decodes a file down to the size the model actually reads.
 *
 * The classifier resizes its input to 224 square internally, so handing it a
 * 4000px screenshot means decoding and resampling megapixels on the main
 * thread for a result identical to doing it here first. That work is what made
 * the page lock up while a picture was checked.
 *
 * `createImageBitmap` does the decode off the main thread where it exists,
 * which is everywhere this site supports; the `Image` path stays for anything
 * that lacks it.
 */
const MODEL_INPUT = 224;

async function toImage(file: File) {
  const canvas = document.createElement("canvas");
  canvas.width = MODEL_INPUT;
  canvas.height = MODEL_INPUT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context");

  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: MODEL_INPUT,
      resizeHeight: MODEL_INPUT,
      resizeQuality: "medium",
    });
    context.drawImage(bitmap, 0, 0, MODEL_INPUT, MODEL_INPUT);
    bitmap.close();
    return { image: canvas, release: () => {} };
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    context.drawImage(image, 0, 0, MODEL_INPUT, MODEL_INPUT);
    return { image: canvas, release: () => URL.revokeObjectURL(url) };
  } catch (reason) {
    URL.revokeObjectURL(url);
    throw reason;
  }
}

/**
 * Whether a picture should be marked sensitive.
 *
 * Never throws. A model that fails to load, a picture that fails to decode and
 * a browser without the APIs all resolve to `checked: false`, because blocking
 * an upload on a failed optional check would be a worse outcome than missing
 * one image.
 */
export async function detectSensitiveImage(
  file: File,
): Promise<SensitivityResult> {
  try {
    const model = await loadModel();
    const { image, release } = await toImage(file);
    let predictions: PredictionType[];
    try {
      predictions = await model.classify(image);
    } finally {
      release();
    }
    return verdictFor(predictions);
  } catch {
    return { sensitive: false, reason: null, checked: false };
  }
}
