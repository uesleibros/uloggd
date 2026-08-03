"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
   * The split is otherwise positional, so the last item in the list is the
   * first to disappear. Settings was last, which put the one destination
   * people reach for by name behind a menu that does not say its name.
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
  const [directCount, setDirectCount] = useState(() =>
    Math.min(4, items.length),
  );

  useEffect(() => {
    const update = () =>
      setDirectCount(
        sidebarDirectItemCapacity(window.innerHeight, items.length),
      );
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
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
    <nav className="main-nav" aria-label={navigationLabel}>
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
