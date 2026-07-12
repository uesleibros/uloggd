import Link from "next/link";
import {
  Compass,
  HomeIcon,
  LibraryBig,
  ListPlus,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { Brand } from "./brand";
import { ActiveLink } from "./active-link";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileSidebar } from "./mobile-sidebar";

const iconMap = {
  home: HomeIcon,
  compass: Compass,
  library: LibraryBig,
  star: Star,
  user: UserRound,
};

export function PlatformNavigation({
  lang,
  dictionary: d,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  const nav = [
    ["home", d.nav.home],
    ["compass", d.nav.explore],
    ["library", d.nav.library],
    ["star", d.nav.reviews],
    ["user", d.nav.profile],
  ] as const;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand lang={lang} />
          <span className="product-stage">{d.platform.beta}</span>
        </div>
        <nav className="main-nav" aria-label={d.platform.navigation}>
          <span className="nav-label">{d.platform.navigation}</span>
          {nav.map(([icon, label], index) => {
            const NavIcon = iconMap[icon];
            return (
              <ActiveLink key={label} href={`/${lang}`}>
                <NavIcon size={20} />
                <span>{label}</span>
                {index === 0 && <i />}
              </ActiveLink>
            );
          })}
        </nav>
        <button className="quick-log">
          <ListPlus size={19} />
          <span>{d.actions.addGame}</span>
          <kbd>+</kbd>
        </button>
        <div className="sidebar-bottom">
          <Link href={`/${lang}/legal/child-safety`}>
            <ShieldCheck size={19} />
            <span>{d.legal.safety}</span>
          </Link>
          <LocaleSwitcher locale={lang} />
          <Link href={`/${lang}`}>
            <Settings size={19} />
            <span>{d.nav.settings}</span>
          </Link>
          <button className="account-button">
            <div className="avatar">U</div>
            <div>
              <strong>{d.actions.signIn}</strong>
              <small>{d.actions.syncJourney}</small>
            </div>
            <span aria-hidden>↗</span>
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <MobileSidebar
          lang={lang}
          labels={{
            menu: d.actions.menu,
            close: d.actions.close,
            home: d.nav.home,
            explore: d.nav.explore,
            library: d.nav.library,
            reviews: d.nav.reviews,
            profile: d.nav.profile,
            settings: d.nav.settings,
            safety: d.legal.safety,
            signIn: d.actions.signIn,
            syncJourney: d.actions.syncJourney,
          }}
        />
        <Brand lang={lang} />
        <button aria-label={d.platform.openSearch}>
          <Search size={21} />
        </button>
      </header>

      <nav className="bottom-nav" aria-label={d.platform.navigation}>
        {nav.map(([icon, label]) => {
          const NavIcon = iconMap[icon];
          return (
            <ActiveLink
              key={label}
              href={`/${lang}`}
              activeClassName="active"
              aria-label={label}
            >
              <NavIcon size={22} />
              <span>{label}</span>
            </ActiveLink>
          );
        })}
      </nav>
    </>
  );
}
