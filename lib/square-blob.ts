import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { createBlobStore, type BlobTransport } from "./blob-storage-core";
import type { ProcessedUserImage, UserImageKind } from "./user-image";
export { newMediaKey } from "./blob-storage-core";
let client: S3Client | undefined;
export function squareBlobConfigured() {
  return Boolean(
    process.env.SQUARE_BLOB_ACCESS_KEY_ID &&
    process.env.SQUARE_BLOB_SECRET_ACCESS_KEY &&
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  );
}
function storage() {
  if (!squareBlobConfigured()) throw new Error("Square Blob is not configured");
  return (client ??= new S3Client({
    endpoint:
      process.env.SQUARE_BLOB_ENDPOINT || "https://s3-blob.squarecloud.app",
    region: process.env.SQUARE_BLOB_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.SQUARE_BLOB_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SQUARE_BLOB_SECRET_ACCESS_KEY!,
    },
    maxAttempts: 2,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  }));
}
const bucket = () => process.env.SQUARE_BLOB_BUCKET || "public";
export async function uploadImage(
  image: ProcessedUserImage,
  userId: string,
  kind: UserImageKind,
  backend: BlobTransport = storage(),
) {
  return createBlobStore(backend, bucket()).upload(image, userId, kind);
}
export async function removeImage(
  key: string | null,
  userId: string,
  backend?: BlobTransport,
) {
  if (!key || !/^(avatars|banners|screenshots|journal)\//.test(key)) return;
  return createBlobStore(backend ?? storage(), bucket()).remove(key, userId);
}
export async function verifyStoredImage(
  key: string,
  backend: BlobTransport = storage(),
) {
  return createBlobStore(backend, bucket()).verify(key);
}
