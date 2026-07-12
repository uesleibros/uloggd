import Link from "next/link";
import {
  Compass,
  HomeIcon,
  LibraryBig,
  LogIn,
  LockKeyhole,
  Settings,
  Star,
  UserRound,
} from "lucide-react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { Brand } from "./brand";
import { ActiveLink } from "./active-link";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { MobileGameSearch } from "./game-search";

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
  isAuthenticated,
}: {
  lang: Locale;
  dictionary: Dictionary;
  isAuthenticated: boolean;
}) {
  const nav = [
    ["home", d.nav.home, false],
    ["compass", d.nav.explore, false],
    ["library", d.nav.library, true],
    ["star", d.nav.reviews, true],
    ["user", d.nav.profile, true],
  ] as const;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand lang={lang} />
          <span className="product-stage">{d.platform.beta}</span>
        </div>
        <div className="sidebar-scroll">
          <nav className="main-nav" aria-label={d.platform.navigation}>
            <span className="nav-label">{d.platform.navigation}</span>
            {nav.map(([icon, label, requiresAuth], index) => {
              const NavIcon = iconMap[icon];
              if (requiresAuth && !isAuthenticated) {
                return (
                  <span
                    className="nav-disabled"
                    key={label}
                    aria-disabled="true"
                    title={d.actions.requiresSignIn}
                  >
                    <NavIcon size={20} />
                    <span>{label}</span>
                    <LockKeyhole className="nav-lock" size={12} />
                  </span>
                );
              }
              if (index !== 0) {
                return (
                  <Link key={label} href={`/${lang}`}>
                    <NavIcon size={20} />
                    <span>{label}</span>
                  </Link>
                );
              }
              return (
                <ActiveLink key={label} href={`/${lang}`}>
                  <NavIcon size={20} />
                  <span>{label}</span>
                  <i />
                </ActiveLink>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <LocaleSwitcher locale={lang} />
            {isAuthenticated ? (
              <Link href={`/${lang}`}>
                <Settings size={19} />
                <span>{d.nav.settings}</span>
              </Link>
            ) : (
              <span
                className="nav-disabled"
                aria-disabled="true"
                title={d.actions.requiresSignIn}
              >
                <Settings size={19} />
                <span>{d.nav.settings}</span>
                <LockKeyhole className="nav-lock" size={12} />
              </span>
            )}
          </div>
        </div>
        <Link className="account-button" href={`/${lang}/login`}>
          <span className="signed-out-icon" aria-hidden>
            <LogIn size={18} />
          </span>
          <div>
            <strong>{d.actions.signIn}</strong>
            <small>{d.actions.syncJourney}</small>
          </div>
          <span aria-hidden>↗</span>
        </Link>
      </aside>

      <header className="mobile-header">
        <MobileSidebar
          lang={lang}
          isAuthenticated={isAuthenticated}
          labels={{
            menu: d.actions.menu,
            close: d.actions.close,
            home: d.nav.home,
            explore: d.nav.explore,
            library: d.nav.library,
            reviews: d.nav.reviews,
            profile: d.nav.profile,
            settings: d.nav.settings,
            signIn: d.actions.signIn,
            syncJourney: d.actions.syncJourney,
            requiresSignIn: d.actions.requiresSignIn,
          }}
        />
        <MobileGameSearch dictionary={d} />
      </header>
    </>
  );
}
