import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import {
  classifyPublishedImage,
  screenProfileImage,
} from "../../lib/server-image-screening.ts";

const samplePath = process.env.ULOGGD_NSFW_REGRESSION_IMAGE;

test(
  "the supplied adult image and its colour and blur edits are sensitive in every upload context",
  {
    skip: samplePath
      ? false
      : "needs an operator-supplied local regression image",
  },
  async () => {
    // Calls only the local classifier. No upload route or image provider is used.
    const original = await readFile(samplePath!);
    const variants = [
      original,
      await sharp(original).tint("#729cc2").png().toBuffer(),
      await sharp(original).blur(3).png().toBuffer(),
      await sharp(original).tint("#729cc2").blur(3).png().toBuffer(),
    ];
    const publishedBytes = async (
      bytes: Buffer,
      size: number,
      quality: number,
    ) =>
      sharp(bytes)
        .rotate()
        .resize({
          width: size,
          height: size,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 5 })
        .toBuffer();
    for (const bytes of variants) {
      assert.equal((await classifyPublishedImage(bytes)).sensitive, true);
      // The exact screenshot and journal publication encodings.
      for (const [size, quality] of [
        [2560, 86],
        [2048, 84],
      ])
        assert.equal(
          (
            await classifyPublishedImage(
              await publishedBytes(bytes, size, quality),
            )
          ).sensitive,
          true,
        );
      for (const kind of ["avatar", "banner"] as const)
        assert.equal(
          (await screenProfileImage(bytes, kind)).verdict.sensitive,
          true,
        );
    }
    const safe = await readFile("public/logo.jpg");
    assert.equal((await classifyPublishedImage(safe)).sensitive, false);
    for (const [size, quality] of [
      [2560, 86],
      [2048, 84],
    ])
      assert.equal(
        (
          await classifyPublishedImage(
            await publishedBytes(safe, size, quality),
          )
        ).sensitive,
        false,
      );
    for (const kind of ["avatar", "banner"] as const)
      assert.equal(
        (await screenProfileImage(safe, kind)).verdict.sensitive,
        false,
      );
  },
);
