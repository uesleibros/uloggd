"use client";

import { EyeOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { tri, type UiLang } from "@/lib/ui-text";

export function ReviewMarkdownPreview({
  content,
  spoilers,
  lang,
}: {
  content: string;
  spoilers: boolean;
  lang: UiLang;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const node = contentRef.current;
    if (!node) return;
    setOverflowing(node.scrollHeight > node.clientHeight + 1);
  }, []);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  const preview = (
    <div
      className="review-markdown-preview"
      data-overflow={overflowing || undefined}
    >
      <div ref={contentRef} className="review-markdown-preview-content">
        <MarkdownContent content={content} lang={lang} variant="review" />
      </div>
    </div>
  );

  if (!spoilers) return preview;
  return (
    <details
      className="spoiler-content review-preview-spoiler"
      onToggle={(event) => {
        if (event.currentTarget.open) requestAnimationFrame(measure);
      }}
    >
      <summary>
        <EyeOff size={14} />{" "}
        {tri(
          lang,
          "Mostrar conteúdo com spoilers",
          "Show spoiler content",
          "Mostrar contenido con spoilers",
        )}
      </summary>
      {preview}
    </details>
  );
}
