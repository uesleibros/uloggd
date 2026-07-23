"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Fired when a link already pointing at the current hash is clicked again. */
export const COMMENT_REVEAL_EVENT = "uloggd:reveal-comment";

const COMMENT_HASH = /^#comment-([A-Za-z0-9_-]{1,64})$/;
/** A slow thread still lands inside this; past it the comment is not coming. */
const WAIT_FOR_COMMENT = 15_000;
/** How long the target is held in place while the page keeps filling in. */
const HOLD_ALIGNMENT = 1_400;

/**
 * Reveals the comment named in the URL hash.
 *
 * Comment threads are fetched client-side after mount, so at the moment a
 * notification navigates here the target does not exist yet — which is why
 * anchoring only ever worked after a reload, when the browser retried the hash
 * on its own. Waiting for the node with a MutationObserver removes the race.
 *
 * The alignment is then held for a beat: avatars, embeds and the rest of the
 * thread land above the target and push it away, which is what made the scroll
 * stop somewhere arbitrary.
 */
export function CommentAnchor() {
  const pathname = usePathname();

  useEffect(() => {
    const disposers: (() => void)[] = [];
    const dispose = () => {
      while (disposers.length) disposers.pop()?.();
    };

    function reveal(node: HTMLElement) {
      // Instant, not smooth: a smooth scroll overtaken by content loading above
      // it simply stops wherever it got to.
      const align = () => node.scrollIntoView({ block: "center" });
      align();
      node.focus({ preventScroll: true });
      node.dataset.highlight = "true";

      const keepAligned = new MutationObserver(align);
      keepAligned.observe(document.body, { childList: true, subtree: true });
      let releaseTimer = 0;
      const release = () => {
        keepAligned.disconnect();
        window.clearTimeout(releaseTimer);
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
      };
      // The reader taking over the scroll ends the hold immediately.
      window.addEventListener("wheel", release, { passive: true });
      window.addEventListener("touchmove", release, { passive: true });
      window.addEventListener("keydown", release);
      releaseTimer = window.setTimeout(release, HOLD_ALIGNMENT);
      disposers.push(release);
      // The mark is not on a timer: it lives as long as the URL points here, so
      // scrolling through the rest of the thread and coming back still shows
      // which comment was linked. Only a new target or leaving clears it.
      disposers.push(() => {
        delete node.dataset.highlight;
      });
    }

    function run() {
      dispose();
      const match = COMMENT_HASH.exec(window.location.hash);
      if (!match) return;
      const id = `comment-${match[1]}`;
      const existing = document.getElementById(id);
      if (existing) {
        reveal(existing);
        return;
      }
      const observer = new MutationObserver(() => {
        const node = document.getElementById(id);
        if (!node) return;
        observer.disconnect();
        reveal(node);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const giveUp = window.setTimeout(
        () => observer.disconnect(),
        WAIT_FOR_COMMENT,
      );
      disposers.push(() => {
        observer.disconnect();
        window.clearTimeout(giveUp);
      });
    }

    run();
    window.addEventListener("hashchange", run);
    window.addEventListener(COMMENT_REVEAL_EVENT, run);
    return () => {
      window.removeEventListener("hashchange", run);
      window.removeEventListener(COMMENT_REVEAL_EVENT, run);
      dispose();
    };
  }, [pathname]);

  return null;
}
