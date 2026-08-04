import "server-only";

/**
 * Turns an image URL into something the card renderer can actually draw.
 *
 * Satori decodes PNG and JPEG but not WebP. Everything uploaded here may be
 * WebP, and ImgChest can even serve WebP bytes from an older URL ending in
 * `.jpg`, so the fetched signature rather than the filename decides whether
 * conversion is needed.
 *
 * Embedded as a data URI rather than served from another route, because this
 * keeps the final generated PNG independent from the source CDN. Formats that
 * need conversion are resized first: the card draws them at 224 points and a
 * full-size screenshot would be megabytes for pixels nobody sees.
 *
 * Every failure returns null and the caller draws its monogram. A share card is
 * not worth failing a page over, and an image host having a bad minute should
 * not turn into a broken unfurl.
 *
 * `sharp` is imported inside the attempt rather than at module scope on
 * purpose. It is a native module with no build for every platform, and a
 * top-level import turns "this machine cannot convert images" into "this route
 * cannot be built at all", which is what happened the first time. Failing to
 * decode a WebP should cost a picture, not a page.
 */
/** Twice the ordinary drawn size, so the card stays sharp on a retina preview. */
const DEFAULT_TARGET = 448;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

type RenderableImageOptions = {
  width?: number;
  height?: number;
};

function nativeMime(source: Buffer): "image/png" | "image/jpeg" | null {
  if (
    source.length >= 8 &&
    source[0] === 0x89 &&
    source[1] === 0x50 &&
    source[2] === 0x4e &&
    source[3] === 0x47 &&
    source[4] === 0x0d &&
    source[5] === 0x0a &&
    source[6] === 0x1a &&
    source[7] === 0x0a
  )
    return "image/png";
  if (
    source.length >= 3 &&
    source[0] === 0xff &&
    source[1] === 0xd8 &&
    source[2] === 0xff
  )
    return "image/jpeg";
  return null;
}

export async function renderableImage(
  url: string | null | undefined,
  options: RenderableImageOptions = {},
): Promise<string | null> {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      // These are shared, immutable assets, and the card is regenerated far
      // more often than they change.
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const announcedSize = Number(response.headers.get("content-length") ?? 0);
    if (announcedSize > MAX_SOURCE_BYTES) return null;
    const source = Buffer.from(await response.arrayBuffer());
    if (!source.length || source.length > MAX_SOURCE_BYTES) return null;

    // Trust the bytes, never the extension or Content-Type. ImgChest keeps a
    // few older profile URLs ending in `.jpg` while serving RIFF/WebP bytes;
    // Satori sees that WebP only after the request and otherwise leaves an
    // empty avatar ring in the generated card. Real PNG/JPEG assets can be
    // embedded directly and do not need a native image dependency at all.
    const mime = nativeMime(source);
    if (mime) return `data:${mime};base64,${source.toString("base64")}`;

    const { default: sharp } = await import("sharp");
    const png = await sharp(source)
      .resize(
        options.width ?? DEFAULT_TARGET,
        options.height ?? DEFAULT_TARGET,
        { fit: "cover", position: "attention" },
      )
      .png({ quality: 82, compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
