"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

export function ShelfCarousel({
  children,
  label,
  lang,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  lang: UiLang;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = useCallback(() => {
    const node = track.current;
    if (!node) return;
    setEdges({
      start: node.scrollLeft <= 2,
      end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2,
    });
  }, []);
  useEffect(() => {
    updateEdges();
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children, updateEdges]);
  function move(direction: -1 | 1) {
    const node = track.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth * 0.82,
      behavior: "smooth",
    });
  }
  return (
    <div className={`shelf-carousel ${className}`}>
      <div className="shelf-carousel-controls" aria-label={label}>
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={edges.start}
          aria-label={`${label}: ${tri(lang, "anterior", "previous", "anterior")}`}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={edges.end}
          aria-label={`${label}: ${tri(lang, "próximo", "next", "siguiente")}`}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div ref={track} className="shelf-carousel-track" onScroll={updateEdges}>
        {children}
      </div>
    </div>
  );
}
