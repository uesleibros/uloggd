import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { processUserImage } from "../lib/user-image";
import {
  uploadImage,
  removeImage,
  verifyStoredImage,
} from "../lib/square-blob";
async function main() {
  const owner = randomUUID();
  const staticImage = await sharp({
    create: { width: 64, height: 64, channels: 4, background: "#7983f5" },
  })
    .png()
    .toBuffer();
  const pixels = Buffer.alloc(64 * 128 * 4);
  pixels.fill(255, 0, 64 * 64 * 4);
  pixels.fill(90, 64 * 64 * 4);
  const animated = await sharp(pixels, {
    raw: { width: 64, height: 128, channels: 4, pageHeight: 64 },
  })
    .gif({ delay: [100, 250], loop: 2 })
    .toBuffer();
  for (const input of [staticImage, animated]) {
    const processed = await processUserImage(input, "avatar");
    const uploaded = await uploadImage(processed, owner, "avatar");
    try {
      await verifyStoredImage(uploaded.key);
      const response = await fetch(uploaded.url, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`public URL status ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(bytes).metadata();
      if ((meta.pages ?? 1) !== processed.frames)
        throw new Error("frame mismatch");
      console.info("media.smoke.verified", {
        format: processed.extension,
        frames: processed.frames,
        bytes: bytes.length,
        cacheControl: response.headers.get("cache-control"),
      });
    } finally {
      await removeImage(uploaded.key, owner);
    }
  }
}
void main().catch((error) => {
  console.error("media.smoke.failed", {
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : "unknown",
  });
  process.exitCode = 1;
});
