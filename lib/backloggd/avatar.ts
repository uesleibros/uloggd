const BACKLOGGD_AVATAR_HOST = "backloggd-avatars.b-cdn.net";
const BACKLOGGD_AVATAR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function normalizeBackloggdAvatarUrl(
  source: string,
  pageUrl?: URL,
): string | null {
  if (source.length > 500) return null;
  let url: URL;
  try {
    url = new URL(source, pageUrl);
  } catch {
    return null;
  }
  const token = url.pathname.slice(1);
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== BACKLOGGD_AVATAR_HOST ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !BACKLOGGD_AVATAR_TOKEN_PATTERN.test(token)
  )
    return null;
  return `https://${BACKLOGGD_AVATAR_HOST}/${token}`;
}

export function backloggdAvatarProxyPath(source: string | null) {
  if (!source) return null;
  const normalized = normalizeBackloggdAvatarUrl(source);
  if (!normalized) return null;
  const token = new URL(normalized).pathname.slice(1);
  return `/api/imports/backloggd/avatar/${encodeURIComponent(token)}`;
}

export function backloggdAvatarSourceUrl(token: string) {
  if (!BACKLOGGD_AVATAR_TOKEN_PATTERN.test(token)) return null;
  return `https://${BACKLOGGD_AVATAR_HOST}/${token}`;
}
