import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import {
  InvalidProfileImageError,
  screenProfileImage,
} from "../../lib/server-image-screening.ts";

test("the server classifies the same normalized bytes it publishes", async () => {
  const source = await readFile("public/logo.jpg");
  const result = await screenProfileImage(source, "avatar");
  const metadata = await sharp(result.processed).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok((metadata.width ?? 0) <= 640);
  assert.equal(result.verdict.checked, true);
  assert.equal(result.verdict.sensitive, false);
});

test("an animated image cannot hide content after its first frame", async () => {
  const pixels = Buffer.alloc(24);
  pixels.fill(255, 0, 12);
  const animated = await sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ loop: 0 })
    .toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  await assert.rejects(
    screenProfileImage(animated, "avatar"),
    InvalidProfileImageError,
  );
});
