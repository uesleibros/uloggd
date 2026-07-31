"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes uloggd installable and gives it an
 * offline fallback.
 *
 * Only in production builds. A service worker in development serves assets from
 * its own cache and will happily hand back a file you just edited, which turns
 * every stale render into a hunt for a bug that is not in the code.
 *
 * No custom install button: `beforeinstallprompt` does not exist on iOS Safari,
 * so a button built on it is a button that silently does nothing for a large
 * part of this audience. Browsers that support installing already offer it
 * themselves, and Next's own PWA guide recommends against the custom prompt for
 * this reason.
 *
 * Registration failures are swallowed on purpose. Everything this enables is an
 * enhancement, so a browser that refuses, or a user browsing privately, should
 * get the normal site and no error.
 */
export function ServiceWorkerManager() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    // Waits for load so registration never competes with the first paint for
    // bandwidth on a slow connection, which is exactly when it would hurt.
    const register = () => {
      if (cancelled) return;
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
