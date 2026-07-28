import { backloggdAvatarSourceUrl } from "@/lib/backloggd/avatar";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 1024 * 1024;

function imageContentType(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  )
    return "image/png";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  )
    return "image/gif";
  return null;
}

async function readBoundedImage(response: Response) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_AVATAR_BYTES) return null;
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_AVATAR_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const sourceUrl = backloggdAvatarSourceUrl(token);
  if (!sourceUrl) return new Response(null, { status: 404 });

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl, {
      cache: "force-cache",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        "User-Agent": "uloggd-partner-import/1.0 (+https://uloggd.com)",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
  if (!upstream.ok) {
    await upstream.body?.cancel();
    return new Response(null, { status: 502 });
  }

  const bytes = await readBoundedImage(upstream);
  const contentType = bytes ? imageContentType(bytes) : null;
  if (!bytes || !contentType) return new Response(null, { status: 415 });

  return new Response(bytes, {
    headers: {
      "Cache-Control":
        "public, max-age=10800, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Length": String(bytes.byteLength),
      "Content-Security-Policy": "default-src 'none'",
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
