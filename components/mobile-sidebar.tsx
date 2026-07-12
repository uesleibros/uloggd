"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Globe2,
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

type MobileSidebarProps = {
  lang: "pt-BR" | "en";
  isAuthenticated: boolean;
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
}: MobileSidebarProps) {
  const pathname = usePathname();
  const nextLocale = lang === "pt-BR" ? "en" : "pt-BR";
  const localeSegments = pathname.split("/");
  localeSegments[1] = nextLocale;
  const localeHref = localeSegments.join("/") || `/${nextLocale}`;
  const links = [
    [HomeIcon, labels.home, `/${lang}`, false],
    [Compass, labels.explore, `/${lang}`, false],
    [LibraryBig, labels.library, `/${lang}`, true],
    [Star, labels.reviews, `/${lang}`, true],
    [UserRound, labels.profile, `/${lang}`, true],
  ] as const;

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="mobile-menu-button" aria-label={labels.menu}>
          <Menu size={22} />
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
                        index === 0 && pathname === href ? true : undefined
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
              <Dialog.Close asChild>
                <Link href={localeHref} hrefLang={nextLocale}>
                  <Globe2 size={19} />
                  {nextLocale === "en" ? "English" : "Português"}
                </Link>
              </Dialog.Close>
              {isAuthenticated ? (
                <Dialog.Close asChild>
                  <Link href={`/${lang}`}>
                    <Settings size={19} />
                    {labels.settings}
                  </Link>
                </Dialog.Close>
              ) : (
                <span
                  className="drawer-disabled"
                  aria-disabled="true"
                  title={labels.requiresSignIn}
                >
                  <Settings size={19} />
                  <span>{labels.settings}</span>
                  <LockKeyhole className="nav-lock" size={13} />
                </span>
              )}
            </div>
          </div>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
