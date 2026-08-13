"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Hovering does not pause an auto shelf. A pointer resting anywhere over a
 * full-width shelf used to freeze it for the whole visit, which read as the
 * autoplay being broken on desktop while it kept working on touch. Movement
 * now stops only for a drag, keyboard focus, or the explicit pause control.
 */
/** How long the drift keeps out of the way after somebody moves the shelf. */
const MANUAL_HOLD_MS = 2500;

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
  /**
   * When the reader last moved the shelf themselves.
   *
   * The drift writes `scrollLeft` on every frame, and an arrow press asks the
   * browser for a smooth scroll that takes several hundred milliseconds. With
   * nothing between them the next frame overwrote the animation and the shelf
   * stopped a few pixels along — reported as "it moves a little and then
   * stops", and only on the shelves that drift, which is what made it look
   * like some carousels were broken and others were not.
   */
  const lastManualMove = useRef(0);
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
    const reducedMotion =
      document.documentElement.dataset.reduceMotion === "true" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    let frame = 0;
    let previous = 0;

    const tick = (time: number) => {
      const elapsed = previous ? Math.min(time - previous, 40) : 0;
      previous = time;
      const max = Math.max(0, node.scrollWidth - node.clientWidth);
      if (
        !document.hidden &&
        !manualPaused &&
        pauseReasons.current.size === 0 &&
        // Long enough for a smooth scroll to land and for the reader to look
        // at where it landed. Shorter than this and the shelf snatches the
        // position back while they are still reading it.
        time - lastManualMove.current > MANUAL_HOLD_MS &&
        max > 2
      ) {
        // Same cadence as the markdown game grid so every auto shelf on the
        // platform drifts at one speed.
        const next = node.scrollLeft + direction.current * elapsed * 0.04;
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
  function noteManualMove() {
    lastManualMove.current = performance.now();
  }
  function move(direction: -1 | 1) {
    const node = track.current;
    if (!node) return;
    lastManualMove.current = performance.now();
    node.scrollBy({
      left: direction * node.clientWidth * 0.82,
      behavior: "smooth",
    });
  }
  function setPaused(reason: string, value: boolean) {
    if (value) pauseReasons.current.add(reason);
    else pauseReasons.current.delete(reason);
  }
  function toggleManualPause() {
    const willResume = manualPaused;
    if (willResume) pauseReasons.current.clear();
    setManualPaused(!manualPaused);
  }
  return (
    <div
      className={`shelf-carousel ${className}`}
      data-autoplay={autoPlay || undefined}
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
            onClick={toggleManualPause}
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
      <div
        ref={track}
        className="shelf-carousel-track"
        onScroll={updateEdges}
        // A wheel, a trackpad swipe or a finger is somebody moving the shelf
        // just as much as the arrow is, and the drift has to get out of the
        // way for all of them. `onScroll` cannot tell them apart, because it
        // fires for the drift's own writes too.
        onWheel={noteManualMove}
        onPointerDown={noteManualMove}
        onTouchStart={noteManualMove}
      >
        {children}
      </div>
    </div>
  );
}
