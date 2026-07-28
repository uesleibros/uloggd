const BACKLOGGD_AVATAR_HOSTS = {
  avatars: "backloggd-avatars.b-cdn.net",
  s3: "backloggd-s3.b-cdn.net",
} as const;
const BACKLOGGD_AVATAR_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type BackloggdAvatarSource = keyof typeof BACKLOGGD_AVATAR_HOSTS;

function avatarSource(hostname: string): BackloggdAvatarSource | null {
  const normalized = hostname.toLowerCase();
  const match = Object.entries(BACKLOGGD_AVATAR_HOSTS).find(
    ([, host]) => host === normalized,
  );
  return (match?.[0] as BackloggdAvatarSource | undefined) ?? null;
}

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
  const sourceKey = avatarSource(url.hostname);
  if (
    url.protocol !== "https:" ||
    !sourceKey ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !BACKLOGGD_AVATAR_TOKEN_PATTERN.test(token)
  )
    return null;
  return `https://${BACKLOGGD_AVATAR_HOSTS[sourceKey]}/${token}`;
}

export function backloggdAvatarProxyPath(source: string | null) {
  if (!source) return null;
  const normalized = normalizeBackloggdAvatarUrl(source);
  if (!normalized) return null;
  const url = new URL(normalized);
  const sourceKey = avatarSource(url.hostname);
  if (!sourceKey) return null;
  const token = url.pathname.slice(1);
  return `/api/imports/backloggd/avatar/${sourceKey}/${encodeURIComponent(token)}`;
}

export function backloggdAvatarSourceUrl(source: string, token: string) {
  if (
    !(source in BACKLOGGD_AVATAR_HOSTS) ||
    !BACKLOGGD_AVATAR_TOKEN_PATTERN.test(token)
  )
    return null;
  return `https://${BACKLOGGD_AVATAR_HOSTS[source as BackloggdAvatarSource]}/${token}`;
}
