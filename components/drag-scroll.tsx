"use client";

import {
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

/**
 * A strip that is dragged rather than scrolled.
 *
 * A row of covers wider than the page is a scrollbar on a desktop and a swipe
 * on a phone, and the first of those is the worst control on the page: a
 * two-pixel bar under the thing you actually want to move. Everything else
 * here that runs off the side is dragged, so this is that behaviour in one
 * place instead of a fourth copy of it.
 *
 * The pointer is captured on the first few pixels of movement rather than on
 * the way down. Capturing immediately sends the click that follows to the
 * strip instead of to the cover it landed on, so every tile could be dragged
 * and none of them could be opened.
 */
export function DragScroll({
  className = "",
  children,
  label,
}: {
  className?: string;
  children: ReactNode;
  /** What the strip is, for anybody arriving by keyboard or screen reader. */
  label?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef({ pointerId: -1, x: 0, scrollLeft: 0, moved: false });

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const node = viewport.current;
    if (!node) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      scrollLeft: node.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const node = viewport.current;
    if (!node || drag.current.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.current.x;
    if (Math.abs(distance) > 4 && !drag.current.moved) {
      drag.current.moved = true;
      node.setPointerCapture(event.pointerId);
    }
    if (!drag.current.moved) return;
    event.preventDefault();
    node.scrollLeft = drag.current.scrollLeft - distance;
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    if (drag.current.pointerId !== event.pointerId) return;
    drag.current.pointerId = -1;
    const node = viewport.current;
    if (node?.hasPointerCapture(event.pointerId))
      node.releasePointerCapture(event.pointerId);
  }

  /** A drag that ends on a link is a drag, not a click on that link. */
  function swallowDraggedClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  }

  return (
    <div
      ref={viewport}
      className={`drag-scroll ${className}`.trim()}
      role={label ? "group" : undefined}
      aria-label={label}
      tabIndex={label ? 0 : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={finish}
      onClickCapture={swallowDraggedClick}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
