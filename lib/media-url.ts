/** Own media is stored as immutable keys; legacy and identity-provider URLs remain readable. */
export const MEDIA_KEY =
  /^(avatars|banners|screenshots|journal)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(avif|webp)$/i;
export const LEGACY_MEDIA_URL = /^https:\/\/(?:cdn\.)?imgchest\.com\//i;

export function mediaBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://media.uloggd.com"
  ).replace(/\/$/, "");
}
export function getMediaUrl<T extends string | null | undefined>(value: T): T {
  return (
    typeof value === "string" && MEDIA_KEY.test(value)
      ? `${mediaBaseUrl()}/${value}`
      : value
  ) as T;
}
export function mediaStorageKey(value: string): string | null {
  if (MEDIA_KEY.test(value)) return value;
  const prefix = `${mediaBaseUrl()}/`;
  const key = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  return MEDIA_KEY.test(key) ? key : null;
}
export function ownsMedia(key: string, userId: string) {
  return MEDIA_KEY.exec(key)?.[2].toLowerCase() === userId.toLowerCase();
}
/** Serialize public URLs at the API boundary without changing persisted keys. */
export function resolveMediaValues(value: unknown): unknown {
  if (typeof value === "string") return getMediaUrl(value);
  if (Array.isArray(value)) return value.map(resolveMediaValues);
  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  )
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveMediaValues(item),
      ]),
    );
  return value;
}
