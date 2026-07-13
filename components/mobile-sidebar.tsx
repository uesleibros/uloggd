"use client";

/* eslint-disable @next/next/no-img-element */

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  HomeIcon,
  LibraryBig,
  LockKeyhole,
  LogIn,
  Menu,
  Settings,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { AccountMenu, type NavigationAccount } from "./account-menu";

type MobileSidebarProps = {
  lang: "pt-BR" | "en";
  isAuthenticated: boolean;
  account: NavigationAccount | null;
  labels: {
    menu: string;
    close: string;
    home: string;
    explore: string;
    library: string;
    reviews: string;
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
}: MobileSidebarProps) {
  const pathname = usePathname();
  const links = [
    [HomeIcon, labels.home, `/${lang}`, false],
    [Compass, labels.explore, `/${lang}`, false],
    [LibraryBig, labels.library, `/${lang}/library`, true],
    [Star, labels.reviews, `/${lang}`, true],
    [UserRound, labels.profile, `/${lang}`, true],
  ] as const;

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
              {links.map(([Icon, label, href, requiresAuth], index) =>
                requiresAuth && !isAuthenticated ? (
                  <span
                    className="drawer-disabled"
                    key={label}
                    aria-disabled="true"
                    title={labels.requiresSignIn}
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
            <div className="drawer-secondary">
              {isAuthenticated ? (
                <Dialog.Close asChild>
                  <Link href={`/${lang}/settings/profile`}>
                    <Settings size={21} />
                    {labels.settings}
                  </Link>
                </Dialog.Close>
              ) : (
                <span
                  className="drawer-disabled"
                  aria-disabled="true"
                  title={labels.requiresSignIn}
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
