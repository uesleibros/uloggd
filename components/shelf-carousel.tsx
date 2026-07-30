"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

export function ShelfCarousel({
  children,
  label,
  lang,
  className = "",
  autoPlay = false,
}: {
  children: React.ReactNode;
  label: string;
  lang: UiLang;
  className?: string;
  autoPlay?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const pauseReasons = useRef(new Set<string>());
  const direction = useRef<1 | -1>(1);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [manualPaused, setManualPaused] = useState(false);
  const updateEdges = useCallback(() => {
    const node = track.current;
    if (!node) return;
    const next = {
      start: node.scrollLeft <= 2,
      end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2,
    };
    setEdges((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, []);
  useEffect(() => {
    updateEdges();
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children, updateEdges]);
  useEffect(() => {
    if (!autoPlay) return;
    const node = track.current;
    if (!node) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previous = 0;

    const tick = (time: number) => {
      const elapsed = previous ? Math.min(time - previous, 64) : 0;
      previous = time;
      const max = Math.max(0, node.scrollWidth - node.clientWidth);
      if (
        !reducedMotion.matches &&
        !document.hidden &&
        !manualPaused &&
        pauseReasons.current.size === 0 &&
        max > 2
      ) {
        const next = node.scrollLeft + direction.current * elapsed * 0.018;
        if (next >= max) {
          node.scrollLeft = max;
          direction.current = -1;
        } else if (next <= 0) {
          node.scrollLeft = 0;
          direction.current = 1;
        } else {
          node.scrollLeft = next;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [autoPlay, children, manualPaused]);
  useEffect(() => {
    const releasePointer = () => pauseReasons.current.delete("pointer");
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    return () => {
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
    };
  }, []);
  function move(direction: -1 | 1) {
    const node = track.current;
    if (!node) return;
    node.scrollBy({
      left: direction * node.clientWidth * 0.82,
      behavior: "smooth",
    });
  }
  function setPaused(reason: string, value: boolean) {
    if (value) pauseReasons.current.add(reason);
    else pauseReasons.current.delete(reason);
  }
  return (
    <div
      className={`shelf-carousel ${className}`}
      data-autoplay={autoPlay || undefined}
      onMouseEnter={() => {
        setPaused("hover", true);
      }}
      onMouseLeave={() => {
        setPaused("hover", false);
      }}
      onPointerDown={() => {
        setPaused("pointer", true);
      }}
      onPointerUp={() => {
        setPaused("pointer", false);
      }}
      onPointerCancel={() => {
        setPaused("pointer", false);
      }}
      onFocus={() => {
        setPaused("focus", true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused("focus", false);
      }}
    >
      <div className="shelf-carousel-controls" aria-label={label}>
        {autoPlay && (
          <button
            type="button"
            className="shelf-carousel-autoplay-control"
            onClick={() => setManualPaused((current) => !current)}
            aria-pressed={manualPaused}
            aria-label={`${label}: ${
              manualPaused
                ? tri(
                    lang,
                    "retomar movimento",
                    "resume movement",
                    "reanudar movimiento",
                  )
                : tri(
                    lang,
                    "pausar movimento",
                    "pause movement",
                    "pausar movimiento",
                  )
            }`}
          >
            {manualPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        )}
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
