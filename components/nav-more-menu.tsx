"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Ellipsis,
  ListTree,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Secondary destinations, folded away so the sidebar keeps a short primary
 * list. Icons live here rather than being passed in, because a server
 * component cannot hand a component reference to a client one.
 */
const icons: Record<string, LucideIcon> = {
  star: Star,
  list: ListTree,
  moderation: ShieldCheck,
  settings: Settings,
};

export type MoreItem = {
  key: string;
  label: string;
  href: string;
  requiresAuth?: boolean;
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

  const holdsCurrent = items.some(
    (item) => pathname === item.href.split("?")[0],
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
            const Icon = icons[item.key] ?? Settings;
            const disabled =
              pending || (item.requiresAuth === true && !isAuthenticated);

            if (disabled) {
              return (
                <DropdownMenu.Item
                  key={item.key}
                  disabled
                  aria-label={
                    pending
                      ? item.label
                      : `${item.label}: ${requiresSignIn}`
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
                    pathname === item.href.split("?")[0] || undefined
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
