"use client";

import { useEffect } from "react";

function resize(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function TextareaAutosizeManager() {
  useEffect(() => {
    if (CSS.supports("field-sizing", "content")) return;

    const resizeAll = (root: ParentNode) => {
      root
        .querySelectorAll<HTMLTextAreaElement>("textarea")
        .forEach((textarea) => resize(textarea));
    };
    const onInput = (event: Event) => {
      if (event.target instanceof HTMLTextAreaElement) resize(event.target);
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node instanceof HTMLTextAreaElement) resize(node);
          else resizeAll(node);
        }
      }
    });

    resizeAll(document);
    document.addEventListener("input", onInput);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("input", onInput);
    };
  }, []);

  return null;
}
