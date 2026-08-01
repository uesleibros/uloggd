import "server-only";

/**
 * Turns an image URL into something the card renderer can actually draw.
 *
 * Satori decodes PNG, JPEG and SVG. Everything uploaded here is WebP, because
 * both the avatar host and the screenshot bucket convert on upload, so without
 * this every avatar and every screenshot falls back to a monogram and the cards
 * carry no picture at all. That is not a small loss: a share card of a
 * screenshot without the screenshot is barely a share card.
 *
 * Converted to a data URI rather than served from a route, because Satori
 * fetches remote images itself and would hit the same decoder. Resized first:
 * the card draws it at 224 points and a full-size screenshot would be megabytes
 * of base64 for pixels nobody sees.
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
const DIRECTLY_RENDERABLE = /\.(png|jpe?g|svg)$/;

/** Twice the drawn size, so the card stays sharp on a retina preview. */
const TARGET = 448;

export async function renderableImage(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  const path = url.split("?")[0].toLowerCase();
  if (DIRECTLY_RENDERABLE.test(path)) return url;

  try {
    const response = await fetch(url, {
      // These are shared, immutable assets, and the card is regenerated far
      // more often than they change.
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    const source = Buffer.from(await response.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const png = await sharp(source)
      .resize(TARGET, TARGET, { fit: "cover", position: "attention" })
      .png({ quality: 82, compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
