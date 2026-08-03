export function navigationPathIsActive(pathname: string, href: string) {
  const target = href.split("?", 1)[0].replace(/\/$/, "") || "/";
  const current = pathname.replace(/\/$/, "") || "/";
  if (target.split("/").filter(Boolean).length === 1) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

/**
 * How many destinations fit in the sidebar before "More" has to appear.
 *
 * Takes the space the navigation actually has and the height one row actually
 * is, both measured from the page. The previous version subtracted a guessed
 * 276px of surrounding chrome from the window height, and the guess went stale
 * the moment a heading was removed from above it: the sidebar kept showing
 * "More" with a free row sitting right underneath.
 *
 * The row reserved for "More" is real estate too, so it is taken out of the
 * count rather than assumed to be free.
 */
export function sidebarDirectItemCapacity(
  availableHeight: number,
  itemCount: number,
  rowHeight: number,
) {
  if (itemCount <= 0) return 0;
  if (!(availableHeight > 0) || !(rowHeight > 0)) return itemCount;
  const slots = Math.floor(availableHeight / rowHeight);
  if (slots >= itemCount) return itemCount;
  // At least one destination stays visible: a sidebar that is only a "More"
  // button is not a sidebar.
  return Math.max(1, slots - 1);
}
