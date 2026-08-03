"use client";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@/components/ui/dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HomeIcon,
  LibraryBig,
  Images,
  Wallet,
  ListTree,
  LockKeyhole,
  LogIn,
  Menu,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { AccountMenu, type NavigationAccount } from "./account-menu";
import { tri, type UiLang } from "@/lib/ui-text";

type MobileSidebarProps = {
  lang: UiLang;
  isAuthenticated: boolean;
  account: NavigationAccount | null;
  labels: {
    menu: string;
    close: string;
    home: string;
    library: string;
    reviews: string;
    lists: string;
    screenshots: string;
    profile: string;
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
}: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const username = account?.username;
  const links = [
    [HomeIcon, labels.home, `/${lang}`, false],
    [
      LibraryBig,
      labels.library,
      username
        ? `/${lang}/library/${username}`
        : `/${lang}/onboarding/username`,
      true,
    ],
    [
      Star,
      labels.reviews,
      username
        ? `/${lang}/reviews/${username}`
        : `/${lang}/onboarding/username`,
      true,
    ],
    [
      ListTree,
      labels.lists,
      username ? `/${lang}/lists/${username}` : `/${lang}/onboarding/username`,
      true,
    ],
    [
      Images,
      labels.screenshots,
      username ? `/${lang}/shots/${username}` : `/${lang}/onboarding/username`,
      true,
    ],
    [
      Wallet,
      tri(lang, "Carteira", "Wallet", "Cartera"),
      username ? `/${lang}/wallet/${username}` : `/${lang}/onboarding/username`,
      true,
    ],
    [
      UserRound,
      labels.profile,
      account?.username
        ? `/${lang}/u/${account.username}`
        : `/${lang}/onboarding/username`,
      true,
    ],
  ] as const;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
              {links.map(([Icon, label, href, requiresAuth], index) =>
                requiresAuth && !isAuthenticated ? (
                  <span
                    className="drawer-disabled"
                    key={label}
                    aria-disabled="true"
                    aria-label={labels.requiresSignIn}
                  >
                    <Icon size={21} />
                    <span>{label}</span>
                    <LockKeyhole className="nav-lock" size={13} />
                  </span>
                ) : (
                  <Dialog.Close asChild key={label}>
                    <Link
                      href={href}
                      data-active={
                        (index === 0
                          ? pathname === href
                          : href !== `/${lang}` && pathname.startsWith(href)) ||
                        undefined
                      }
                    >
                      <Icon size={21} />
                      <span>{label}</span>
                    </Link>
                  </Dialog.Close>
                ),
              )}
            </nav>
          </div>
          {account ? (
            <AccountMenu
              account={account}
              lang={lang}
              onNavigate={() => setOpen(false)}
            />
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
