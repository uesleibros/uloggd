const maxTransportBytes = 4 * 1024 * 1024;

/** Largest source file the pickers accept before any client-side re-encoding. */
export const MAX_IMAGE_SOURCE_BYTES = 12 * 1024 * 1024;

/**
 * Re-encodes a picked image to WebP small enough to survive the request body
 * limit, shrinking further on each pass until it fits. The server re-processes
 * whatever arrives, so this is purely about getting the bytes there.
 */
export async function prepareImageUpload(
  file: File,
  {
    maxSide = 2560,
    name = "upload.webp",
  }: { maxSide?: number; name?: string } = {},
) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const source = new Image();
    source.src = sourceUrl;
    await source.decode();
    const largestSide = Math.max(source.naturalWidth, source.naturalHeight);
    let scale = Math.min(1, maxSide / largestSide);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas_unavailable");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    for (const quality of [0.86, 0.78, 0.7, 0.62]) {
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("encode_failed")),
          "image/webp",
          quality,
        ),
      );
      if (blob.type === "image/webp" && blob.size <= maxTransportBytes)
        return new File([blob], name, { type: "image/webp" });
      scale *= 0.82;
    }
    throw new Error("transport_too_large");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
