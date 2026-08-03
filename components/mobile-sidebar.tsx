"use client";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@/components/ui/dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LockKeyhole,
  MoreHorizontal,
  LogIn,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import { NAVIGATION_ICONS, NAVIGATION_ICON_FALLBACK } from "./navigation-icons";
import type { SidebarNavigationItem } from "./adaptive-sidebar-navigation";
import { navigationPathIsActive } from "@/lib/navigation";
import { AccountMenu, type NavigationAccount } from "./account-menu";
import { tri, type UiLang } from "@/lib/ui-text";

type MobileSidebarProps = {
  lang: UiLang;
  isAuthenticated: boolean;
  account: NavigationAccount | null;
  /** The rail's own list, so order and contents match it exactly. */
  items: SidebarNavigationItem[];
  moreLabel: string;
  labels: {
    menu: string;
    close: string;
    home: string;
    library: string;
    reviews: string;
    lists: string;
    screenshots: string;
    profile: string;
    settings: string;
    signIn: string;
    syncJourney: string;
    requiresSignIn: string;
  };
};

export function MobileSidebar({
  lang,
  labels,
  isAuthenticated,
  account,
  items,
  moreLabel,
}: MobileSidebarProps) {
  const pathname = usePathname();
  // How many fit before the drawer needs scrolling. Measured rather than
  // guessed: a phone in landscape has room for three and one in portrait for
  // ten, and a fixed number would either hide destinations that fit or let the
  // list run off the bottom.
  const [capacity, setCapacity] = useState(items.length);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    function measure() {
      // The drawer's chrome above and below the list: brand row, account
      // block, secondary links and their gutters.
      const rows = Math.floor((window.innerHeight - 330) / 52);
      setCapacity(Math.max(4, rows));
    }
    measure();
    window.addEventListener("resize", measure, { passive: true });
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Pinned destinations claim their slots first, exactly as the rail does, and
  // one row is kept for "More" whenever anything is going to overflow.
  const pinnedCount = items.filter((item) => item.pinned).length;
  const flexibleSlots = Math.max(0, capacity - pinnedCount - 1);
  const flexibleShown = new Set(
    items.length <= capacity
      ? items.filter((item) => !item.pinned)
      : items.filter((item) => !item.pinned).slice(0, flexibleSlots),
  );
  const direct = items.filter((item) => item.pinned || flexibleShown.has(item));
  const overflow = items.filter(
    (item) => !item.pinned && !flexibleShown.has(item),
  );

  function renderItem(item: SidebarNavigationItem) {
    const Icon = NAVIGATION_ICONS[item.icon] ?? NAVIGATION_ICON_FALLBACK;
    if (item.requiresAuth === true && !isAuthenticated)
      return (
        <span
          className="drawer-disabled"
          key={item.key}
          aria-disabled="true"
          aria-label={labels.requiresSignIn}
        >
          <Icon size={21} />
          <span>{item.label}</span>
          <LockKeyhole className="nav-lock" size={13} />
        </span>
      );
    return (
      <Dialog.Close asChild key={item.key}>
        <Link
          href={item.href}
          data-active={navigationPathIsActive(pathname, item.href) || undefined}
        >
          <Icon size={21} />
          <span>{item.label}</span>
        </Link>
      </Dialog.Close>
    );
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="mobile-menu-button" aria-label={labels.menu}>
          {account ? (
            <span className="mobile-menu-identity" aria-hidden>
              {account.avatarUrl ? (
                <img src={account.avatarUrl} alt="" />
              ) : (
                (account.displayName || account.username || account.email)
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </span>
          ) : (
            <Menu size={22} />
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content className="mobile-drawer" aria-describedby={undefined}>
          <div className="drawer-header">
            <Dialog.Title className="sr-only">{labels.menu}</Dialog.Title>
            <Brand lang={lang} />
            <Dialog.Close aria-label={labels.close}>
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="drawer-scroll">
            <nav className="drawer-navigation">
              {direct.map((item) => renderItem(item))}
              {overflow.length > 0 && (
                <>
                  <button
                    type="button"
                    className="drawer-more-trigger"
                    aria-expanded={showMore}
                    onClick={() => setShowMore((open) => !open)}
                  >
                    <MoreHorizontal size={21} />
                    <span>{moreLabel}</span>
                    <ChevronDown
                      className="drawer-more-chevron"
                      size={16}
                      aria-hidden
                    />
                  </button>
                  {showMore && (
                    <div className="drawer-more-items">
                      {overflow.map((item) => renderItem(item))}
                    </div>
                  )}
                </>
              )}
            </nav>
            <div className="drawer-secondary">
              {isAuthenticated ? (
                <>
                  {(account?.role === "ADMIN" ||
                    account?.role === "MODERATOR") && (
                    <Dialog.Close asChild>
                      <Link
                        href={`/${lang}/moderation`}
                        data-active={
                          pathname.startsWith(`/${lang}/moderation`) ||
                          undefined
                        }
                      >
                        <ShieldCheck size={21} />
                        {tri(lang, "Moderação", "Moderation", "Moderación")}
                      </Link>
                    </Dialog.Close>
                  )}
                  <Dialog.Close asChild>
                    <Link
                      href={`/${lang}/settings?tab=general`}
                      data-active={
                        pathname.startsWith(`/${lang}/settings`) || undefined
                      }
                    >
                      <Settings size={21} />
                      {labels.settings}
                    </Link>
                  </Dialog.Close>
                </>
              ) : (
                <span
                  className="drawer-disabled"
                  aria-disabled="true"
                  aria-label={labels.requiresSignIn}
                >
                  <Settings size={21} />
                  <span>{labels.settings}</span>
                  <LockKeyhole className="nav-lock" size={13} />
                </span>
              )}
            </div>
          </div>
          {account ? (
            <AccountMenu account={account} lang={lang} />
          ) : (
            <Dialog.Close asChild>
              <Link className="drawer-account" href={`/${lang}/login`}>
                <span className="signed-out-icon" aria-hidden>
                  <LogIn size={18} />
                </span>
                <div>
                  <strong>{labels.signIn}</strong>
                  <span>{labels.syncJourney}</span>
                </div>
              </Link>
            </Dialog.Close>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
