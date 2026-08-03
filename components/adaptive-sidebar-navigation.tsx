"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  navigationPathIsActive,
  sidebarDirectItemCapacity,
} from "@/lib/navigation";
import { NavMoreMenu, type MoreItem } from "./nav-more-menu";
import { NAVIGATION_ICONS, NAVIGATION_ICON_FALLBACK } from "./navigation-icons";

export type SidebarNavigationItem = MoreItem & {
  icon: "home" | "search" | "library" | "profile" | MoreItem["key"];
  /**
   * Never moved into the overflow menu, however short the window is.
   *
   * The split is otherwise positional, so the last flexible item in the list
   * is the first to disappear. Profile is pinned because it closes the main
   * navigation consistently on desktop and mobile.
   */
  pinned?: boolean;
};

export function AdaptiveSidebarNavigation({
  items,
  moreLabel,
  navigationLabel,
  isAuthenticated,
  pending,
  requiresSignIn,
}: {
  items: SidebarNavigationItem[];
  moreLabel: string;
  navigationLabel: string;
  isAuthenticated: boolean;
  pending: boolean;
  requiresSignIn: string;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  // Everything until the first measurement, which is also what the server
  // renders. Starting short would flash a "More" button that then vanishes on
  // the majority of screens, where everything fits.
  const [directCount, setDirectCount] = useState(items.length);

  /**
   * Measures instead of guessing.
   *
   * The count depends on the room left in the scrolling column after the
   * things sharing it, and on how tall a row really is. Both are read off the
   * page: a constant for either one goes stale the moment the sidebar's
   * furniture changes, which is exactly how "More" ended up appearing with a
   * free row underneath it.
   *
   * Driven entirely by the observer, which fires once on observe, so no state
   * is written straight from the effect body.
   */
  useEffect(() => {
    const nav = navRef.current;
    const column = nav?.parentElement;
    if (!nav || !column) return;

    const outerHeight = (element: Element) => {
      const style = getComputedStyle(element);
      return (
        (element as HTMLElement).offsetHeight +
        (parseFloat(style.marginTop) || 0) +
        (parseFloat(style.marginBottom) || 0)
      );
    };

    const measure = () => {
      const columnStyle = getComputedStyle(column);
      const padding =
        (parseFloat(columnStyle.paddingTop) || 0) +
        (parseFloat(columnStyle.paddingBottom) || 0);
      // Whatever else shares the column, at whatever height it currently is.
      const taken = Array.from(column.children)
        .filter((child) => child !== nav)
        .reduce((total, child) => total + outerHeight(child), 0);

      const row = nav.firstElementChild;
      const gap = parseFloat(getComputedStyle(nav).rowGap) || 0;
      const rowHeight = row ? (row as HTMLElement).offsetHeight + gap : 0;

      setDirectCount(
        sidebarDirectItemCapacity(
          column.clientHeight - padding - taken,
          items.length,
          rowHeight,
        ),
      );
    };

    // The column's own height is set by the sidebar, not by what is inside it,
    // so changing the count cannot change what is being measured. Nothing here
    // can feed itself.
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    for (const child of column.children)
      if (child !== nav) observer.observe(child);
    return () => observer.disconnect();
  }, [items.length]);

  // Pinned items claim their slots first; the rest fill what is left, in their
  // original order so the sidebar does not reshuffle as the window resizes.
  const pinnedCount = items.filter((item) => item.pinned).length;
  const flexibleSlots = Math.max(0, directCount - pinnedCount);
  const flexibleShown = new Set(
    items.filter((item) => !item.pinned).slice(0, flexibleSlots),
  );
  // Filtered from the original list rather than concatenated, so the sidebar
  // keeps its order instead of reshuffling as the window resizes.
  const directItems = items.filter(
    (item) => item.pinned || flexibleShown.has(item),
  );
  const overflowItems = items.filter(
    (item) => !item.pinned && !flexibleShown.has(item),
  );

  return (
    // The heading is only on the `nav`, where a screen reader reads it and
    // nobody else has to. A sidebar of six labelled icons does not need a word
    // above it saying it is a sidebar.
    <nav className="main-nav" ref={navRef} aria-label={navigationLabel}>
      {directItems.map((item) => {
        const Icon = NAVIGATION_ICONS[item.icon] ?? NAVIGATION_ICON_FALLBACK;
        const disabled =
          pending || (item.requiresAuth === true && !isAuthenticated);
        if (disabled)
          return (
            <Tooltip
              key={item.key}
              side="right"
              label={pending ? item.label : requiresSignIn}
            >
              <span className="nav-disabled" aria-disabled="true">
                <Icon size={20} />
                <span>{item.label}</span>
                {!pending && <LockKeyhole className="nav-lock" size={12} />}
              </span>
            </Tooltip>
          );

        const active = navigationPathIsActive(pathname, item.href);
        return (
          <Tooltip key={item.key} label={item.label} side="right">
            <Link
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          </Tooltip>
        );
      })}
      <NavMoreMenu
        items={overflowItems}
        label={moreLabel}
        isAuthenticated={isAuthenticated}
        pending={pending}
        requiresSignIn={requiresSignIn}
      />
    </nav>
  );
}
