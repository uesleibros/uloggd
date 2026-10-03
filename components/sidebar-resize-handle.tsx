"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { tri, type UiLang } from "@/lib/ui-text";

const STORAGE_KEY = "uloggd_sidebar_width";
const DEFAULT_WIDTH = 232;
const MIN_WIDTH = 220;
const maxWidth = () => Math.min(360, Math.floor(window.innerWidth * 0.3));
const clampWidth = (width: number) =>
  Math.max(MIN_WIDTH, Math.min(maxWidth(), width));

export function SidebarResizeHandle({ lang }: { lang: UiLang }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const desired = useRef(DEFAULT_WIDTH);
  const dragging = useRef<number | null>(null);

  const apply = useCallback((value: number) => {
    const next = clampWidth(value);
    document.documentElement.style.setProperty(
      "--sidebar-expanded-width",
      `${next}px`,
    );
    setWidth(next);
    return next;
  }, []);

  function persist(value: number) {
    desired.current = value;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* Storage can be unavailable. */
    }
  }

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= 360)
        desired.current = saved;
    } catch {
      /* Use the default width. */
    }
    const frame = requestAnimationFrame(() => apply(desired.current));
    const resize = () => apply(desired.current);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      delete document.documentElement.dataset.sidebarResizing;
    };
  }, [apply]);

  return (
    <div
      className="sidebar-resize-handle"
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label={tri(
        lang,
        "Largura da barra lateral",
        "Sidebar width",
        "Ancho de la barra lateral",
      )}
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={360}
      aria-valuenow={width}
      onPointerDown={(event) => {
        if (
          event.button !== 0 ||
          document.documentElement.hasAttribute("data-sidebar-collapsed")
        )
          return;
        event.preventDefault();
        dragging.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        document.documentElement.dataset.sidebarResizing = "true";
      }}
      onPointerMove={(event) => {
        if (dragging.current !== event.pointerId) return;
        const sidebar = event.currentTarget.parentElement!;
        apply(event.clientX - sidebar.getBoundingClientRect().left);
      }}
      onPointerUp={(event) => {
        if (dragging.current !== event.pointerId) return;
        persist(width);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => {
        dragging.current = null;
        delete document.documentElement.dataset.sidebarResizing;
      }}
      onDoubleClick={() => persist(apply(DEFAULT_WIDTH))}
      onKeyDown={(event) => {
        const next =
          event.key === "ArrowLeft"
            ? width - 8
            : event.key === "ArrowRight"
              ? width + 8
              : event.key === "Home"
                ? DEFAULT_WIDTH
                : null;
        if (next === null) return;
        event.preventDefault();
        persist(apply(next));
      }}
    />
  );
}
