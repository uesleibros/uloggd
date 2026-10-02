import { originalGameCover } from "./game-cover";

export type ContextLinkKind =
  "game" | "profile" | "list" | "screenshot" | "image" | "link";

/** Only HTTP links are offered to the context menu's navigation actions. */
export function contextLink(href: string, origin: string) {
  try {
    const url = new URL(href, origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    let kind: ContextLinkKind = "link";
    if (url.origin === origin) {
      const segment = url.pathname.split("/")[2];
      if (segment === "game") kind = "game";
      if (segment === "u") kind = "profile";
      if (segment === "lists") kind = "list";
      if (segment === "shot") kind = "screenshot";
    }
    return { url: url.href, kind };
  } catch {
    return null;
  }
}

/** Resolve the source behind Next's thumbnail before opening the viewer. */
export function contextImageUrl(href: string, origin: string) {
  const link = contextLink(href, origin);
  if (!link) return null;
  const url = new URL(link.url);
  if (url.origin === origin && url.pathname === "/_next/image") {
    const source = url.searchParams.get("url");
    if (!source) return null;
    const original = contextLink(source, origin);
    return original ? originalGameCover(original.url) : null;
  }
  return originalGameCover(link.url);
}
