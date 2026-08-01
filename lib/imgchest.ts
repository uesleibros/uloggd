import "server-only";

/**
 * Uploading images to imgchest, which is where every user image lives.
 *
 * Nothing goes to Supabase storage. Keeping the bytes off the database host
 * means image traffic never competes with queries for the same quota, and a
 * bucket policy can no longer be the thing that decides whether a picture is
 * visible: the row's own visibility rules are.
 *
 * The trade is that the URL is unguessable rather than access-controlled. That
 * is why posts are created `hidden` and why the URL is only ever handed out
 * alongside a row the viewer was already allowed to read.
 */
const IMGCHEST_URL = /^https:\/\/(?:cdn\.)?imgchest\.com\//i;

export type UploadedImage = {
  url: string;
  /** The imgchest post id, kept so the image can be removed with its row. */
  remoteId: string | null;
};

export function imgchestConfigured() {
  return Boolean(process.env.IMGCHEST_API_KEY);
}

/**
 * Uploads one image and returns where it landed.
 *
 * Returns null rather than throwing on every failure mode, since every caller
 * has the same answer to "the upload did not work": tell the person, keep the
 * row unwritten. The URL is validated against the expected host before it is
 * stored, because a stored URL is later rendered as an image and read back as
 * trusted.
 */
export async function uploadImage(
  bytes: Buffer | Uint8Array,
  filename: string,
  contentType = "image/webp",
): Promise<UploadedImage | null> {
  const apiKey = process.env.IMGCHEST_API_KEY;
  if (!apiKey) return null;

  const form = new FormData();
  form.append(
    "images[]",
    new Blob([new Uint8Array(bytes)], { type: contentType }),
    filename,
  );
  // Hidden posts stay out of imgchest's own galleries and search. The link
  // still works for anyone holding it, which is why it is only handed out with
  // a row the viewer could already read.
  form.append("privacy", "hidden");

  try {
    const response = await fetch("https://api.imgchest.com/v1/post", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      data?: { id?: string; images?: Array<{ link?: string }> };
    };
    const url = payload.data?.images?.[0]?.link;
    if (!url || !IMGCHEST_URL.test(url)) return null;
    return { url, remoteId: payload.data?.id ?? null };
  } catch {
    return null;
  }
}

/**
 * Best-effort removal. A failure here leaves an orphan on imgchest and must
 * never stop the row from going away: a deleted screenshot that still appears
 * because cleanup failed is far worse than an unreferenced file.
 */
export async function removeImage(remoteId: string | null, scope: string) {
  const apiKey = process.env.IMGCHEST_API_KEY;
  if (!remoteId || !apiKey) return;
  try {
    await fetch(`https://api.imgchest.com/v1/post/${remoteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error(`[${scope}] remote cleanup failed`, { remoteId, error });
  }
}

export { IMGCHEST_URL };
