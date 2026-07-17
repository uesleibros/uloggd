"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

const TOP_REVEAL_DISTANCE = 14;
const TOP_VISIBLE_RANGE = 80;
const HIDE_AFTER = 128;
const DIRECTION_THRESHOLD = 8;

export function SmartHeader({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const headerRef = useRef<HTMLElement>(null);
  const anchorY = useRef(0);
  const direction = useRef<"up" | "down">("up");
  const frame = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const supportsPersistentHover = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    );
    anchorY.current = window.scrollY;

    const clearHideTimer = () => {
      if (hideTimer.current === null) return;
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    };
    const reveal = () => {
      clearHideTimer();
      setHidden(false);
    };
    const hasFocusThatNeedsVisibility = () => {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) return false;
      if (!header.contains(activeElement)) return false;
      return (
        activeElement.matches("input, textarea, select, [contenteditable]") ||
        activeElement.matches(":focus-visible")
      );
    };
    const isLockedOpen = () =>
      (supportsPersistentHover.matches && header.matches(":hover")) ||
      hasFocusThatNeedsVisibility() ||
      Boolean(
        header.querySelector(
          '[aria-expanded="true"], [data-state="open"], [aria-pressed="true"]',
        ),
      );
    const conceal = () => {
      if (window.scrollY <= HIDE_AFTER || isLockedOpen()) return;
      setHidden(true);
    };
    const onScroll = () => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        const currentY = Math.max(window.scrollY, 0);
        const delta = currentY - anchorY.current;

        if (currentY <= TOP_VISIBLE_RANGE) {
          direction.current = "up";
          anchorY.current = currentY;
          reveal();
          return;
        }
        if (Math.abs(delta) < DIRECTION_THRESHOLD) return;

        direction.current = delta > 0 ? "down" : "up";
        anchorY.current = currentY;
        if (direction.current === "up") reveal();
        else conceal();
      });
    };
    const onPointerMove = (event: PointerEvent) => {
      if (
        event.pointerType === "mouse" &&
        event.clientY <= TOP_REVEAL_DISTANCE
      ) {
        reveal();
      }
    };
    const onPointerLeave = () => {
      clearHideTimer();
      if (direction.current !== "down" || window.scrollY <= HIDE_AFTER) return;
      hideTimer.current = window.setTimeout(conceal, 420);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    header.addEventListener("pointerenter", reveal);
    header.addEventListener("pointerleave", onPointerLeave);
    header.addEventListener("focusin", reveal);

    return () => {
      clearHideTimer();
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointermove", onPointerMove);
      header.removeEventListener("pointerenter", reveal);
      header.removeEventListener("pointerleave", onPointerLeave);
      header.removeEventListener("focusin", reveal);
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className={`${className} smart-header`}
      data-scroll-hidden={hidden ? "true" : "false"}
    >
      {children}
    </header>
  );
}
