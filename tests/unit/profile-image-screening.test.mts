import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import {
  classifyPublishedImage,
  InvalidProfileImageError,
  screenProfileImage,
} from "../../lib/server-image-screening.ts";

test("the server classifies the same normalized bytes it publishes", async () => {
  const source = await readFile("public/logo.jpg");
  const result = await screenProfileImage(source, "avatar");
  const metadata = await sharp(result.processed).metadata();
  assert.equal(metadata.format, "heif");
  assert.equal(metadata.compression, "av1");
  assert.ok((metadata.width ?? 0) <= 512);
  assert.equal(result.verdict.checked, true);
  assert.equal(result.verdict.sensitive, false);
  const published = await classifyPublishedImage(result.processed);
  assert.equal(published.checked, true);
  assert.equal(published.sensitive, false);
});

test("safe animation retains every frame and its timing after server screening", async () => {
  const pixels = Buffer.alloc(24);
  pixels.fill(255, 0, 12);
  const animated = await sharp(pixels, {
    raw: { width: 2, height: 4, channels: 3, pageHeight: 2 },
  })
    .gif({ loop: 0, delay: [100, 250] })
    .toBuffer();
  assert.equal((await sharp(animated).metadata()).pages, 2);
  const result = await screenProfileImage(animated, "avatar");
  const published = await sharp(result.processed).metadata();
  assert.equal(published.pages, 2);
  assert.deepEqual(published.delay, [100, 250]);
  assert.equal(result.verdict.sensitive, false);
  assert.equal(result.verdict.checked, true);
});

test("invalid image bytes remain rejected", async () => {
  await assert.rejects(
    screenProfileImage(Buffer.from("not a GIF"), "avatar"),
    InvalidProfileImageError,
  );
});
