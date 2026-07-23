"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Starts every route at the top.
 *
 * The App Router only resets scroll when it can prove the new content is out of
 * view, and with streamed pages the reset happens before the body has grown, so
 * navigating from halfway down one page often lands halfway down the next.
 *
 * Back and forward are left alone: the browser restores those positions itself
 * and overriding it would break the one case where keeping the scroll is right.
 */
export function ScrollReset() {
  const pathname = usePathname();
  const cameFromHistory = useRef(false);

  useEffect(() => {
    const remember = () => {
      cameFromHistory.current = true;
    };
    window.addEventListener("popstate", remember);
    return () => window.removeEventListener("popstate", remember);
  }, []);

  useEffect(() => {
    if (cameFromHistory.current) {
      cameFromHistory.current = false;
      return;
    }
    // A URL that names an anchor is asking for a specific place on the page,
    // not the top. Without this the reset raced CommentAnchor and won.
    if (window.location.hash) return;
    // Instant, not smooth: a new route should already be at the top when it
    // paints, not scroll up while the reader watches.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
