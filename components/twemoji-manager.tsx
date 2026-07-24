"use client";

import { useEffect } from "react";
import twemoji from "@twemoji/api";

const TWEMOJI_OPTIONS = {
  folder: "svg",
  ext: ".svg",
  className: "twemoji",
  attributes: () => ({
    draggable: "false",
    loading: "lazy",
    decoding: "async",
  }),
} as const;

const IGNORED_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "script",
  "style",
  "code",
  "pre",
  "[contenteditable]",
  "[data-no-twemoji]",
  "img.twemoji",
  ".cm-editor",
].join(",");

function canParse(element: HTMLElement) {
  return (
    !element.matches(IGNORED_SELECTOR) && !element.closest(IGNORED_SELECTOR)
  );
}

/**
 * twemoji.parse() rewrites every emoji text node beneath whatever it is given,
 * and it knows nothing about our ignore list. So checking only the element and
 * its ancestors was not enough: any mutation on a container that *holds* the
 * editor made us hand twemoji an ancestor, and it would walk down into
 * CodeMirror and swap the emoji you had just typed for an <img>, corrupting
 * the document the editor thought it had.
 *
 * Descending until no ignored subtree is left keeps the replacement to the
 * parts of the page that should have it.
 */
function parseSafely(element: HTMLElement) {
  if (!canParse(element)) return;
  if (element.querySelector(IGNORED_SELECTOR)) {
    for (const child of Array.from(element.children)) {
      if (child instanceof HTMLElement) parseSafely(child);
    }
    return;
  }
  twemoji.parse(element, TWEMOJI_OPTIONS);
}

export function TwemojiManager() {
  useEffect(() => {
    let frame = 0;
    let idle = 0;
    let started = false;
    const pending = new Set<HTMLElement>();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const parent = mutation.target.parentElement;
          if (parent && canParse(parent)) pending.add(parent);
          continue;
        }

        for (const node of mutation.addedNodes) {
          const element =
            node instanceof HTMLElement ? node : node.parentElement;
          if (element && canParse(element)) pending.add(element);
        }
      }

      if (pending.size === 0 || frame) return;
      frame = window.requestAnimationFrame(() => {
        observer.disconnect();
        for (const element of pending) {
          if (element.isConnected) parseSafely(element);
        }
        pending.clear();
        observer.observe(document.body, {
          childList: true,
          characterData: true,
          subtree: true,
        });
        frame = 0;
      });
    });

    // Rewriting emoji into <img> before React has finished hydrating a subtree
    // mutates DOM it is about to claim, and React 19 streams and hydrates
    // concurrently — so the first paint of any page carrying server-rendered
    // emoji raced this parse and threw hydration mismatches (#418). Waiting for
    // load, then for the main thread to go idle, lets that hydration work drain
    // first; the observer then keeps up with content added afterwards (client
    // navigations, live updates), which React owns cleanly.
    const start = () => {
      if (started) return;
      started = true;
      parseSafely(document.body);
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    };

    const schedule = () => {
      idle =
        typeof window.requestIdleCallback === "function"
          ? window.requestIdleCallback(start, { timeout: 2000 })
          : window.setTimeout(start, 200);
    };
    const cancelSchedule = () => {
      if (!idle) return;
      if (typeof window.cancelIdleCallback === "function")
        window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    return () => {
      window.removeEventListener("load", schedule);
      cancelSchedule();
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      pending.clear();
    };
  }, []);

  return null;
}
