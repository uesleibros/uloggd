import { MAX_IMAGE_INPUT_BYTES } from "./user-image";
import { getMediaUrl, LEGACY_MEDIA_URL, mediaStorageKey } from "./media-url";
export async function downloadUserMedia(reference: string) {
  if (!LEGACY_MEDIA_URL.test(reference) && !mediaStorageKey(reference))
    throw new Error("untrusted image location");
  const key = mediaStorageKey(reference);
  let url = getMediaUrl(reference);
  let response: Response;
  const signal = AbortSignal.timeout(20_000);
  for (let attempt = 0; ; attempt++) {
    response = await fetch(url, { redirect: "manual", signal });
    if (response.status < 300 || response.status >= 400) break;
    await response.body?.cancel();
    const location = response.headers.get("location");
    if (!location || attempt >= 2) throw new Error("untrusted image redirect");
    const next = new URL(location, url);
    const trusted =
      next.protocol === "https:" &&
      !next.username &&
      !next.password &&
      !next.port &&
      (key
        ? next.hostname === "blob.squarecloud.dev" &&
          next.pathname.startsWith("/pub/") &&
          next.pathname.endsWith(`/${key}`)
        : LEGACY_MEDIA_URL.test(next.href));
    if (!trusted) throw new Error("untrusted image redirect");
    url = next.href;
  }
  if (
    !response.ok ||
    !response.body ||
    Number(response.headers.get("content-length")) > MAX_IMAGE_INPUT_BYTES
  )
    throw new Error("image unavailable or too large");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_IMAGE_INPUT_BYTES)
        throw new Error("image download exceeds limit");
      chunks.push(value);
    }
    return Buffer.concat(chunks, size);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
