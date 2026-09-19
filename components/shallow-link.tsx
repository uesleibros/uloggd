"use client";

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";

/**
 * A link to another view of the page you are already on.
 *
 * Filter tabs and page numbers change the URL and nothing else: the section
 * underneath reads `useSearchParams` and fetches what it needs itself. A plain
 * `<Link>` to such a URL still asks the server to render the whole page again,
 * so every tab waited on a round trip for a frame that had not changed. This
 * moves the address with the native history call instead, which Next folds into
 * its router so `useSearchParams` sees it, and the section does the rest.
 *
 * It stays a real `<a href>`. Opening it in a new tab, copying it, or a crawler
 * following it all get the full page, because none of those are plain clicks.
 */
export function ShallowLink({
  href,
  onClick,
  replace = false,
  ...rest
}: ComponentProps<typeof Link> & {
  href: string;
  /** Replace the current history entry rather than adding one. */
  replace?: boolean;
}) {
  function handle(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    shallowNavigate(href, { replace });
  }
  return <Link href={href} onClick={handle} {...rest} />;
}

/** The same move, for code that changes the URL without a link to click. */
export function shallowNavigate(
  href: string,
  { replace = false }: { replace?: boolean } = {},
) {
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}
