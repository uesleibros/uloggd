"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";

const STORAGE_KEY = "uloggd_sidebar_collapsed";

export function SidebarCollapseButton({ lang }: { lang: "pt-BR" | "en" }) {
  const [collapsed, setCollapsed] = useState(false);
  const pt = lang === "pt-BR";

  useEffect(() => {
    let readyFrame = 0;
    const hydrate = window.setTimeout(() => {
      let saved = false;
      try {
        saved = window.localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        // Keep the expanded default when browser storage is unavailable.
      }
      setCollapsed(saved);
      document.documentElement.toggleAttribute("data-sidebar-collapsed", saved);
      readyFrame = window.requestAnimationFrame(() => {
        document.documentElement.setAttribute("data-sidebar-ready", "");
      });
    }, 0);
    return () => {
      window.clearTimeout(hydrate);
      window.cancelAnimationFrame(readyFrame);
    };
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.toggleAttribute("data-sidebar-collapsed", next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Collapsing still works for the current page without persistence.
    }
  }

  const label = collapsed
    ? pt
      ? "Expandir sidebar"
      : "Expand sidebar"
    : pt
      ? "Recolher sidebar"
      : "Collapse sidebar";

  return (
    <Tooltip label={label} side="right">
      <button
        className="sidebar-collapse-button"
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-pressed={collapsed}
      >
        {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
      </button>
    </Tooltip>
  );
}
