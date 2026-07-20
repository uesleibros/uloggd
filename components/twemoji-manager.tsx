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
].join(",");

function canParse(element: HTMLElement) {
  return (
    !element.matches(IGNORED_SELECTOR) && !element.closest(IGNORED_SELECTOR)
  );
}

export function TwemojiManager() {
  useEffect(() => {
    let frame = 0;
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
          if (element.isConnected && canParse(element)) {
            twemoji.parse(element, TWEMOJI_OPTIONS);
          }
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

    twemoji.parse(document.body, TWEMOJI_OPTIONS);
    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      pending.clear();
    };
  }, []);

  return null;
}
