"use client";

import { useEffect } from "react";

const DARK = new Set(["dark", "onyx"]);

/**
 * Tells fumadocs which theme the site is in.
 *
 * The site keys its palette on `data-theme` and fumadocs keys its own on a
 * `dark` class, so the documentation would sit in light mode inside a dark
 * site with nothing wrong anywhere. This mirrors one into the other, watches
 * for the switch, and takes the class back off on the way out so it cannot
 * follow the reader to a page that never asked for it.
 */
export function DocsThemeBridge() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      root.classList.toggle("dark", DARK.has(root.dataset.theme ?? ""));
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      root.classList.remove("dark");
    };
  }, []);

  return null;
}
