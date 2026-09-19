"use client";

import { useEffect } from "react";
import { findEmoji, splitEmoji } from "@/lib/emoji-match";

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
 * Whether React has claimed this node yet.
 *
 * React marks every DOM node it hydrates with an internal `__reactFiber$`
 * property. A node without one belongs to a boundary React has not reached, and
 * rewriting its emoji into an <img> there makes the markup disagree with what
 * React is about to render: it throws #418 and throws the server HTML for the
 * whole boundary away to render it again, which is both the error in the
 * console and a visible flash of the page.
 */
function hydrated(node: Node) {
  const claimed = (target: Node) => {
    for (const key in target) if (key.startsWith("__reactFiber$")) return true;
    return false;
  };
  // Text that is an element's only child gets no node of its own in React:
  // the element's text is set directly, so its element is what gets marked.
  return claimed(node) || (!!node.parentNode && claimed(node.parentNode));
}

/** The text node's emoji as images, the rest as text, in one fragment. */
function drawn(text: string) {
  const fragment = document.createDocumentFragment();
  for (const part of splitEmoji(text) ?? [text]) {
    if (typeof part === "string") {
      fragment.append(part);
      continue;
    }
    const image = document.createElement("img");
    image.className = "twemoji";
    image.src = part.src;
    image.alt = part.raw;
    image.draggable = false;
    image.loading = "lazy";
    image.decoding = "async";
    fragment.append(image);
  }
  return fragment;
}

/**
 * Rewrites the emoji beneath `element`, and returns whether any were left for
 * later because React had not hydrated them yet.
 *
 * twemoji.parse(), handed an element, rewrites every emoji text node beneath
 * it, and it knows nothing about our ignore list or about hydration
 * (it once walked into CodeMirror and swapped the emoji you had just typed for
 * an <img>, corrupting the document the editor thought it had). So the text is
 * found here, one node at a time, and only a node that is safe to change is
 * rewritten: outside the ignore list, and already React's.
 */
function parseSafely(element: HTMLElement) {
  if (!canParse(element)) return false;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const ready: Text[] = [];
  let deferred = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !findEmoji(node.nodeValue ?? "").length || !canParse(parent))
      continue;
    if (hydrated(node)) ready.push(node as Text);
    else deferred = true;
  }
  for (const node of ready) node.replaceWith(drawn(node.nodeValue ?? ""));
  return deferred;
}

/** How often, and for how long, to come back for emoji React had not reached. */
const RETRY_MS = 400;
const RETRY_LIMIT = 50;

export function TwemojiManager() {
  useEffect(() => {
    let frame = 0;
    let idle = 0;
    let retry = 0;
    let retries = 0;
    let started = false;
    const pending = new Set<HTMLElement>();
    const watch = () =>
      observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
      });

    /** Parses without hearing its own rewrites as new content. */
    const parse = (elements: Iterable<HTMLElement>) => {
      observer.disconnect();
      let deferred = false;
      for (const element of elements)
        if (element.isConnected && parseSafely(element)) deferred = true;
      watch();
      if (deferred) later();
    };

    // Some of the page had not been hydrated yet. Nothing will announce when
    // it is (hydration adds no nodes for the observer to see), so look again.
    const later = () => {
      if (retry || retries >= RETRY_LIMIT) return;
      retries += 1;
      retry = window.setTimeout(() => {
        retry = 0;
        parse([document.body]);
      }, RETRY_MS);
    };

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
        frame = 0;
        const elements = [...pending];
        pending.clear();
        parse(elements);
      });
    });

    // Waiting for load and then for an idle moment keeps this off the first
    // paint. It used to be what kept it off React's hydration too, and it did
    // not: a page that arrives whole hydrates its route boundary after that
    // idle moment, and the emoji rewritten underneath it threw #418. Only
    // nodes React has claimed are touched now (see hydrated), so the timing is
    // about cost again, not correctness.
    const start = () => {
      if (started) return;
      started = true;
      parse([document.body]);
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
      window.clearTimeout(retry);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      pending.clear();
    };
  }, []);

  return null;
}
