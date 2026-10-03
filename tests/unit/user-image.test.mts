import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import {
  processUserImage,
  InvalidUserImageError,
  MAX_IMAGE_INPUT_BYTES,
} from "../../lib/user-image.ts";
import {
  getMediaUrl,
  mediaStorageKey,
  ownsMedia,
} from "../../lib/media-url.ts";
import {
  createBlobStore,
  newMediaKey,
  type BlobTransport,
} from "../../lib/blob-storage-core.ts";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import {
  groupLegacyMedia,
  migrateMediaGroup,
  type LegacyMediaReference,
} from "../../lib/media-migration.ts";
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const png = () =>
  sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 80, g: 120, b: 220, alpha: 0.4 },
    },
  })
    .png()
    .toBuffer();
const animation = async (format: "gif" | "webp", delay = [100, 250]) => {
  const pixels = Buffer.alloc(64 * 128 * 4);
  pixels.fill(255, 0, 64 * 64 * 4);
  pixels.fill(80, 64 * 64 * 4);
  return sharp(pixels, {
    raw: { width: 64, height: 128, channels: 4, pageHeight: 64 },
  })
    [format]({ loop: 2, delay })
    .toBuffer();
};
for (const format of ["png", "jpeg", "webp", "gif", "avif"] as const)
  test(`static ${format} becomes AVIF, never upscales or retains EXIF`, async () => {
    const source = await sharp(await png())
      [format]()
      .toBuffer();
    const result = await processUserImage(source, "avatar", `image/${format}`);
    assert.equal(result.extension, "avif");
    assert.equal(result.contentType, "image/avif");
    assert.equal(result.frames, 1);
    const metadata = await sharp(result.buffer).metadata();
    assert.equal(metadata.format, "heif");
    assert.equal(metadata.compression, "av1");
    assert.equal(metadata.width, 64);
    assert.equal(metadata.exif, undefined);
  });
for (const format of ["gif", "webp"] as const)
  test(`${format} retains all animation frames, timing, loop and alpha`, async () => {
    const result = await processUserImage(
      await animation(format),
      "avatar",
      `image/${format}`,
    );
    const meta = await sharp(result.buffer).metadata();
    assert.equal(result.extension, "webp");
    assert.equal(meta.pages, 2);
    assert.deepEqual(meta.delay, [100, 250]);
    assert.equal(meta.loop, 2);
    assert.equal(meta.hasAlpha, true);
  });
test("AVIF preserves transparency", async () => {
  const result = await processUserImage(await png(), "avatar");
  const raw = await sharp(result.buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(raw.info.channels, 4);
  assert.ok(raw.data[3] > 80 && raw.data[3] < 130);
});
test("screenshot bounds and EXIF orientation are applied", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: "#2266aa" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await processUserImage(source, "screenshot");
  assert.ok(result.width <= 1920 && result.height <= 1080);
  assert.equal(result.width, 720);
  assert.equal(result.height, 1080);
});
test("fake MIME, SVG, oversized bytes, excessive animation duration and screenshot animation are rejected", async () => {
  await assert.rejects(
    processUserImage(await png(), "avatar", "image/jpeg"),
    InvalidUserImageError,
  );
  await assert.rejects(
    processUserImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"/>',
      ),
      "avatar",
    ),
    InvalidUserImageError,
  );
  await assert.rejects(
    processUserImage(Buffer.alloc(MAX_IMAGE_INPUT_BYTES + 1), "avatar"),
    InvalidUserImageError,
  );
  await assert.rejects(
    processUserImage(await animation("gif", [10000, 10000]), "avatar"),
    InvalidUserImageError,
  );
  await assert.rejects(
    processUserImage(await animation("webp"), "screenshot"),
    InvalidUserImageError,
  );
  // A valid PNG header with bomb dimensions fails before decoding its pixel payload.
  const bomb = Buffer.from(await png());
  bomb.writeUInt32BE(100000, 16);
  bomb.writeUInt32BE(100000, 20);
  await assert.rejects(processUserImage(bomb, "avatar"), InvalidUserImageError);
});
test("UUID keys, public URLs and legacy read fallback exclude traversal and other owners", () => {
  const key = newMediaKey("avatar", owner, "avif");
  assert.match(key, new RegExp(`^avatars/${owner}/[0-9a-f-]{36}\\.avif$`));
  assert.equal(mediaStorageKey(getMediaUrl(key)), key);
  assert.equal(ownsMedia(key, owner), true);
  assert.equal(ownsMedia(key, other), false);
  for (const key of [
    "avatars/../../file.avif",
    `avatars/${owner}/../file.avif`,
    "https://attacker.test/a.avif",
  ])
    assert.equal(mediaStorageKey(key), null);
  const legacy = "https://cdn.imgchest.com/files/old.webp";
  assert.equal(getMediaUrl(legacy), legacy);
});
test("S3 publishes immutable typed bytes, rejects cross-owner deletion and compensates failed uploads", async () => {
  const commands: unknown[] = [];
  const transport = {
    send: async (command: unknown) => {
      commands.push(command);
      return {};
    },
  } as unknown as BlobTransport;
  const store = createBlobStore(transport, "public");
  const image = await processUserImage(await png(), "avatar");
  const stored = await store.upload(image, owner, "avatar");
  const put = commands[0] as PutObjectCommand;
  assert.equal(put.input.ContentType, "image/avif");
  assert.equal(put.input.CacheControl, "public, max-age=31536000, immutable");
  assert.equal(put.input.IfNoneMatch, "*");
  assert.equal(put.input.Body, image.buffer);
  await assert.rejects(store.remove(stored.key, other));
  assert.equal(commands.length, 1);
  await store.remove(stored.key, owner);
  assert.ok(commands[1] instanceof DeleteObjectCommand);
  const rollback: unknown[] = [];
  const failing = createBlobStore(
    {
      send: async (command: unknown) => {
        rollback.push(command);
        if (command instanceof PutObjectCommand) throw new Error("timeout");
        return {};
      },
    } as unknown as BlobTransport,
    "public",
  );
  await assert.rejects(failing.upload(image, owner, "avatar"));
  assert.ok(rollback[1] instanceof DeleteObjectCommand);
  assert.equal(
    (rollback[0] as PutObjectCommand).input.Key,
    (rollback[1] as DeleteObjectCommand).input.Key,
  );
});
test("migration dry-run has no side effects and a resumed group reuses its object", async () => {
  const ref: LegacyMediaReference = {
    table: "profiles",
    column: "avatar_url",
    id: owner,
    owner,
    kind: "avatar",
    value: "https://cdn.imgchest.com/files/a.webp",
  };
  assert.equal(
    groupLegacyMedia([ref, { ...ref, table: "profile_image_history" }]).length,
    1,
  );
  let calls = 0;
  const options = {
    find: async () => "existing",
    upload: async () => {
      calls++;
      return "new";
    },
    verify: async () => {
      calls++;
    },
    remember: async () => {
      calls++;
    },
    update: async () => {
      calls++;
    },
  };
  await migrateMediaGroup([ref], { ...options, dryRun: true });
  assert.equal(calls, 0);
  await migrateMediaGroup([ref], { ...options, dryRun: false });
  assert.equal(calls, 2);
});
