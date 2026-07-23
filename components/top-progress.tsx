"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The thin loading bar across the top of the page, the one every news site
 * has. App Router keeps the current page on screen while it fetches the next
 * one, so a slow route — a publisher page on a cold cache, say — gives no sign
 * anything is happening. This fills that gap.
 *
 * There is no global "navigation started" event in the App Router, so the bar
 * is driven off what can be observed: an internal link click is the start, and
 * the history entry the router writes when the new route commits is the end.
 * It only appears if the navigation is still going after a short delay, so a
 * prefetched, instant transition never flashes it.
 */
const APPEAR_DELAY = 140;
const TRICKLE_CEILING = 92;
const SAFETY_TIMEOUT = 12_000;

export function TopProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timers = useRef<number[]>([]);
  const trickle = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      window.clearInterval(trickle.current);
      timers.current = [];
    };

    const start = () => {
      if (running.current) return;
      running.current = true;
      // Held back by APPEAR_DELAY: a navigation that resolves before then never
      // paints the bar, which is what keeps cached links from flickering.
      timers.current.push(
        window.setTimeout(() => {
          setVisible(true);
          setProgress(8);
          trickle.current = window.setInterval(() => {
            // Eases toward the ceiling and never reaches it — the bar cannot
            // claim to be done until the route actually commits.
            setProgress((current) =>
              current >= TRICKLE_CEILING
                ? current
                : current + (TRICKLE_CEILING - current) * 0.12,
            );
          }, 260);
          // A navigation that never commits (cancelled, blocked) still has to
          // let go of the bar.
          timers.current.push(window.setTimeout(done, SAFETY_TIMEOUT));
        }, APPEAR_DELAY),
      );
    };

    const done = () => {
      if (!running.current) return;
      running.current = false;
      clearTimers();
      setProgress(100);
      // Hold the full bar briefly, then fade and reset for the next trip.
      timers.current.push(
        window.setTimeout(() => {
          setVisible(false);
          timers.current.push(window.setTimeout(() => setProgress(0), 220));
        }, 200),
      );
    };

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("rel")?.includes("external")
      )
        return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      // External hosts navigate the whole document; the bar would never get a
      // commit event to close it.
      if (url.origin !== window.location.origin) return;
      // Same page, or a jump to an anchor on it: no route fetch, no bar.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return;
      start();
    };

    // The router writes the new URL through pushState/replaceState the moment
    // the route is ready to show — that is the signal the fetch is over.
    const patch = (key: "pushState" | "replaceState") => {
      const original = history[key];
      const wrapped: typeof original = function (this: History, ...args) {
        done();
        return original.apply(this, args);
      };
      history[key] = wrapped;
      return () => {
        history[key] = original;
      };
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", done);
    const unpatchPush = patch("pushState");
    const unpatchReplace = patch("replaceState");
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", done);
      unpatchPush();
      unpatchReplace();
      clearTimers();
    };
  }, []);

  if (!visible && progress === 0) return null;
  return (
    <div
      className="top-progress"
      data-visible={visible || undefined}
      aria-hidden
      style={{ transform: `scaleX(${progress / 100})` }}
    />
  );
}
