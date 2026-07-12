"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Globe2,
  HomeIcon,
  LibraryBig,
  Menu,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { Brand } from "./brand";

type MobileSidebarProps = {
  lang: "pt-BR" | "en";
  labels: {
    menu: string;
    close: string;
    home: string;
    explore: string;
    library: string;
    reviews: string;
    profile: string;
    settings: string;
    safety: string;
    signIn: string;
    syncJourney: string;
  };
};

export function MobileSidebar({ lang, labels }: MobileSidebarProps) {
  const pathname = usePathname();
  const nextLocale = lang === "pt-BR" ? "en" : "pt-BR";
  const localeSegments = pathname.split("/");
  localeSegments[1] = nextLocale;
  const localeHref = localeSegments.join("/") || `/${nextLocale}`;
  const links = [
    [HomeIcon, labels.home, `/${lang}`],
    [Compass, labels.explore, `/${lang}`],
    [LibraryBig, labels.library, `/${lang}`],
    [Star, labels.reviews, `/${lang}`],
    [UserRound, labels.profile, `/${lang}`],
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
          <nav className="drawer-navigation">
            {links.map(([Icon, label, href], index) => (
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
            ))}
          </nav>
          <div className="drawer-secondary">
            <Dialog.Close asChild>
              <Link href={`/${lang}/legal/child-safety`}>
                <ShieldCheck size={19} />
                {labels.safety}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={localeHref} hrefLang={nextLocale}>
                <Globe2 size={19} />
                {nextLocale === "en" ? "English" : "Português"}
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Link href={`/${lang}`}>
                <Settings size={19} />
                {labels.settings}
              </Link>
            </Dialog.Close>
          </div>
          <div className="drawer-account">
            <div className="avatar">U</div>
            <div>
              <strong>{labels.signIn}</strong>
              <span>{labels.syncJourney}</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
