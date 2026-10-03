import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { ownsMedia } from "../../../lib/media-url";
export async function removeFixtureMedia(key: string | null, owner: string) {
  if (!key || !ownsMedia(key, owner)) return;
  const client = new S3Client({
    endpoint: process.env.SQUARE_BLOB_ENDPOINT,
    region: process.env.SQUARE_BLOB_REGION || "auto",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.SQUARE_BLOB_ACCESS_KEY_ID!,
      secretAccessKey: process.env.SQUARE_BLOB_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.SQUARE_BLOB_BUCKET || "public",
        Key: key,
      }),
    );
  } finally {
    client.destroy();
  }
}
