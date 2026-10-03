import {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { ownsMedia, MEDIA_KEY, getMediaUrl } from "./media-url";
import type { ProcessedUserImage, UserImageKind } from "./user-image";
export type BlobTransport = Pick<S3Client, "send">;
export function newMediaKey(
  kind: UserImageKind,
  userId: string,
  extension: "avif" | "webp",
) {
  const prefix =
    kind === "avatar"
      ? "avatars"
      : kind === "banner"
        ? "banners"
        : kind === "journal"
          ? "journal"
          : "screenshots";
  const key = `${prefix}/${userId}/${randomUUID()}.${extension}`;
  if (!MEDIA_KEY.test(key)) throw new Error("invalid media key");
  return key;
}
export function createBlobStore(backend: BlobTransport, bucket: string) {
  return {
    async upload(
      image: ProcessedUserImage,
      userId: string,
      kind: UserImageKind,
    ) {
      const key = newMediaKey(kind, userId, image.extension);
      console.info("media.upload.start", {
        type: kind,
        storageKey: key,
        bytes: image.optimizedBytes,
      });
      try {
        await backend.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: image.buffer,
            ContentType: image.contentType,
            CacheControl: "public, max-age=31536000, immutable",
            IfNoneMatch: "*",
          }),
          { abortSignal: AbortSignal.timeout(20_000) },
        );
        console.info("media.upload.success", { storageKey: key });
        return { key, url: getMediaUrl(key) };
      } catch (error) {
        console.error("media.upload.failed", {
          storageKey: key,
          name: error instanceof Error ? error.name : "unknown",
        });
        // A timeout may follow an accepted upload. Compensate without overwriting another UUID.
        await backend
          .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }), {
            abortSignal: AbortSignal.timeout(10_000),
          })
          .catch(() => {});
        throw error;
      }
    },
    async remove(key: string | null, userId: string) {
      if (!key || !MEDIA_KEY.test(key)) return;
      if (!ownsMedia(key, userId)) throw new Error("media ownership mismatch");
      try {
        await backend.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
          { abortSignal: AbortSignal.timeout(10_000) },
        );
        console.info("media.delete.success", { storageKey: key });
      } catch (error) {
        console.error("media.delete.failed", {
          storageKey: key,
          name: error instanceof Error ? error.name : "unknown",
        });
        throw error;
      }
    },
    async verify(key: string) {
      if (!MEDIA_KEY.test(key)) throw new Error("invalid media key");
      return backend.send(new HeadObjectCommand({ Bucket: bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(10_000),
      });
    },
  };
}
