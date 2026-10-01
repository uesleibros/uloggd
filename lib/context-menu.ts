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
