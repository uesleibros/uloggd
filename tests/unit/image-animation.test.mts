import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { isAnimatedImage } from "../../lib/image-animation.ts";

test("browser preflight keeps static GIF available and detects animated GIF/WebP", async () => {
  const still = sharp({
    create: { width: 2, height: 2, channels: 3, background: "white" },
  });
  assert.equal(
    await isAnimatedImage(new Blob([await still.gif().toBuffer()])),
    false,
  );
  assert.equal(
    await isAnimatedImage(new Blob([await still.png().toBuffer()])),
    false,
  );
  const pixels = Buffer.alloc(24);
  pixels.fill(255, 0, 12);
  const frames = sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  });
  assert.equal(
    await isAnimatedImage(
      new Blob([await frames.gif({ delay: [100, 200] }).toBuffer()]),
    ),
    true,
  );
  assert.equal(
    await isAnimatedImage(
      new Blob([await frames.webp({ delay: [100, 200] }).toBuffer()]),
    ),
    true,
  );
});
