"use client";

import { Ellipsis, LockKeyhole } from "lucide-react";
import { NAVIGATION_ICONS, NAVIGATION_ICON_FALLBACK } from "./navigation-icons";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationPathIsActive } from "@/lib/navigation";

/**
 * Secondary destinations, folded away so the sidebar keeps a short primary
 * list. Icons live here rather than being passed in, because a server
 * component cannot hand a component reference to a client one.
 */

export type MoreItem = {
  key: string;
  label: string;
  href: string;
  requiresAuth?: boolean;
  /** Icon name from the shared map. Falls back to the key for older callers. */
  icon?: string;
};

export function NavMoreMenu({
  items,
  label,
  isAuthenticated,
  pending = false,
  requiresSignIn,
}: {
  items: MoreItem[];
  label: string;
  isAuthenticated: boolean;
  pending?: boolean;
  requiresSignIn: string;
}) {
  const pathname = usePathname();

  if (!items.length) return null;

  const holdsCurrent = items.some((item) =>
    navigationPathIsActive(pathname, item.href),
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="nav-more-trigger"
          data-active={holdsCurrent || undefined}
          aria-label={label}
        >
          <Ellipsis size={20} />
          <span>{label}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="nav-more-menu"
          side="right"
          align="end"
          sideOffset={10}
          collisionPadding={12}
        >
          {items.map((item) => {
            const Icon =
              NAVIGATION_ICONS[item.icon ?? item.key] ??
              NAVIGATION_ICON_FALLBACK;
            const disabled =
              pending || (item.requiresAuth === true && !isAuthenticated);

            if (disabled) {
              return (
                <DropdownMenu.Item
                  key={item.key}
                  disabled
                  aria-label={
                    pending ? item.label : `${item.label}: ${requiresSignIn}`
                  }
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {!pending && <LockKeyhole className="nav-lock" size={13} />}
                </DropdownMenu.Item>
              );
            }

            return (
              <DropdownMenu.Item key={item.key} asChild>
                <Link
                  href={item.href}
                  data-active={
                    navigationPathIsActive(pathname, item.href) || undefined
                  }
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
