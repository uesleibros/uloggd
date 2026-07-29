"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  HomeIcon,
  LibraryBig,
  ListTree,
  LockKeyhole,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  navigationPathIsActive,
  sidebarDirectItemCapacity,
} from "@/lib/navigation";
import { NavMoreMenu, type MoreItem } from "./nav-more-menu";

export type SidebarNavigationItem = MoreItem & {
  icon: "home" | "search" | "library" | "profile" | MoreItem["key"];
};

const icons: Record<string, ComponentType<{ size?: number }>> = {
  home: HomeIcon,
  search: Search,
  library: LibraryBig,
  profile: UserRound,
  star: Star,
  list: ListTree,
  moderation: ShieldCheck,
  settings: Settings,
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

  const directItems = items.slice(0, directCount);
  const overflowItems = items.slice(directCount);

  return (
    <nav className="main-nav" aria-label={navigationLabel}>
      <span className="nav-label">{navigationLabel}</span>
      {directItems.map((item) => {
        const Icon = icons[item.icon] ?? Settings;
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
