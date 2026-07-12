"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  lang: string;
  otherLocale: string;
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
  };
};

export function MobileSidebar({
  lang,
  otherLocale,
  labels,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);
  const links = [
    [HomeIcon, labels.home, `/${lang}`],
    [Compass, labels.explore, `/${lang}`],
    [LibraryBig, labels.library, `/${lang}`],
    [Star, labels.reviews, `/${lang}`],
    [UserRound, labels.profile, `/${lang}`],
  ] as const;

  return (
    <>
      <button
        className="mobile-menu-button"
        onClick={() => setOpen(true)}
        aria-label={labels.menu}
        aria-expanded={open}
      >
        <Menu size={23} />
      </button>
      <div
        className={`drawer-layer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <button
          className="drawer-backdrop"
          onClick={close}
          aria-label={labels.close}
          tabIndex={open ? 0 : -1}
        />
        <aside className="mobile-drawer" aria-label={labels.menu}>
          <div className="drawer-header">
            <Brand lang={lang} />
            <button onClick={close} aria-label={labels.close}>
              <X size={22} />
            </button>
          </div>
          <div className="drawer-profile">
            <div className="avatar">UB</div>
            <div>
              <strong>Ueslei</strong>
              <span>@uesleibros</span>
            </div>
          </div>
          <nav>
            {links.map(([Icon, label, href]) => (
              <Link key={label} href={href} onClick={close}>
                <Icon size={22} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="drawer-secondary">
            <Link href={`/${lang}/legal/child-safety`} onClick={close}>
              <ShieldCheck size={20} />
              {labels.safety}
            </Link>
            <Link href={`/${otherLocale}`} onClick={close}>
              <Globe2 size={20} />
              {otherLocale === "en" ? "English" : "Português"}
            </Link>
            <Link href={`/${lang}`} onClick={close}>
              <Settings size={20} />
              {labels.settings}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
