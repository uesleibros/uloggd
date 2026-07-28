"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Ellipsis,
  ListTree,
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

export type MoreItem = { key: string; label: string; href: string };

export function NavMoreMenu({
  items,
  label,
}: {
  items: MoreItem[];
  label: string;
}) {
  const pathname = usePathname();
  if (!items.length) return null;
  // The trigger reads as active while you are on one of the pages it hides,
  // otherwise the sidebar would show nothing selected on those routes.
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
