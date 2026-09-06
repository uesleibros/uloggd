"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Whether this reader asked for less motion, either way they can ask.
 *
 * `useReducedMotion` reads the operating system's setting and nothing else, so
 * the switch in appearance settings stopped every CSS animation on the page
 * and left every Motion one running beside it. This reads both, and any
 * component that moves should use it in place of the Motion hook.
 *
 * Watched rather than read once: the setting writes the attribute on the
 * document element, and somebody turning it on should see the page go still
 * without reloading to find out whether it worked.
 *
 * Starts as `false` on both halves so the first client render matches the
 * server's, then settles in an effect. A component that renders motion for one
 * frame is not the problem this solves; a hydration mismatch would be.
 */
export function useStill() {
  const system = useReducedMotion();
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setChosen(root.dataset.reduceMotion === "true");
    read();
    const watcher = new MutationObserver(read);
    watcher.observe(root, {
      attributes: true,
      attributeFilter: ["data-reduce-motion"],
    });
    return () => watcher.disconnect();
  }, []);

  return Boolean(system) || chosen;
}
