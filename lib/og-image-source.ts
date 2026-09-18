import "server-only";
import { acquireImageSlot, loadSharp } from "@/lib/image-processing";

/**
 * Turns an image URL into something the card renderer can actually draw.
 *
 * Satori decodes PNG and JPEG but not WebP. Everything uploaded here may be
 * WebP, and ImgChest can even serve WebP bytes from an older URL ending in
 * `.jpg`, so the fetched signature rather than the filename decides whether
 * conversion is needed.
 *
 * Embedded as a data URI rather than served from another route, because this
 * keeps the final generated PNG independent from the source CDN. Anything that
 * needs converting, and anything large, is resized first: the card draws it at
 * 224 points and a full-size screenshot would be megabytes for pixels nobody
 * sees, held in memory the renderer never gives back.
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
const CARD_IMAGE_WAIT_MS = 2000;
const CARD_IMAGE_QUEUE = 32;
/**
 * Above this, a PNG or JPEG is resized rather than embedded. An IGDB cover is
 * a few dozen kilobytes; a screenshot or a banner is hundreds.
 */
const EMBED_AS_IS_BYTES = 160 * 1024;

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
    // Small PNG and JPEG go in as they are: a catalogue cover is a few dozen
    // kilobytes and already about the size it is drawn at.
    //
    // Large ones used to go in as they were too, and that was the expensive
    // mistake. Only WebP was ever resized, because only WebP needed converting,
    // so a 1920x1080 screenshot or a full-width banner reached the renderer at
    // full size to be drawn at 224 points. The renderer decodes in WebAssembly,
    // whose memory grows to fit the largest image it has ever seen and never
    // shrinks: measured, a worker serving screenshot cards went from 117MB to
    // 350MB resident with its live heap flat at 70MB. And the card's data is
    // cached with the image inside it, so each of those megabytes was stored a
    // second time as base64.
    if (mime && source.length <= EMBED_AS_IS_BYTES)
      return `data:${mime};base64,${source.toString("base64")}`;

    const releaseSlot = await acquireImageSlot({
      timeoutMs: CARD_IMAGE_WAIT_MS,
      maxQueued: CARD_IMAGE_QUEUE,
    });
    try {
      const sharp = await loadSharp();
      const resized = sharp(source).resize(
        options.width ?? DEFAULT_TARGET,
        options.height ?? DEFAULT_TARGET,
        { fit: "cover", position: "attention" },
      );
      // A photograph as JPEG: as PNG the same 448px square is several times
      // the size for no visible difference. Anything that may be transparent,
      // an avatar cut out of its background or a logo, stays PNG.
      const { hasAlpha } = await sharp(source).metadata();
      if (hasAlpha || mime === "image/png") {
        const png = await resized
          .png({ quality: 82, compressionLevel: 9 })
          .toBuffer();
        return `data:image/png;base64,${png.toString("base64")}`;
      }
      const jpeg = await resized
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    } finally {
      releaseSlot();
    }
  } catch {
    return null;
  }
}
