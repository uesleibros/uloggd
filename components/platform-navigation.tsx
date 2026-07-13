import Link from "next/link";
import {
  Compass,
  HomeIcon,
  LibraryBig,
  ListTree,
  LogIn,
  LockKeyhole,
  Settings,
  Star,
  UserRound,
} from "lucide-react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { AccountMenu, type NavigationAccount } from "./account-menu";
import { Brand } from "./brand";
import { ActiveLink } from "./active-link";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { MobileGameSearch } from "./game-search";
import { SidebarCollapseButton } from "./sidebar-collapse-button";

const iconMap = {
  home: HomeIcon,
  compass: Compass,
  library: LibraryBig,
  star: Star,
  user: UserRound,
  list: ListTree,
};

export function PlatformNavigation({
  lang,
  dictionary: d,
  account,
  searchCacheScope,
}: {
  lang: Locale;
  dictionary: Dictionary;
  account: NavigationAccount | null;
  searchCacheScope: string;
}) {
  const isAuthenticated = Boolean(account);
  const nav = [
    ["home", d.nav.home, false],
    ["compass", d.nav.explore, false],
    ["library", d.nav.library, true],
    ["star", d.nav.reviews, true],
    ["list", d.nav.lists, true],
    ["user", d.nav.profile, true],
  ] as const;

  return (
    <>
      <aside className="sidebar">
        <SidebarCollapseButton lang={lang} />
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
                const href =
                  icon === "compass"
                    ? `/${lang}/explore`
                    : icon === "library"
                      ? `/${lang}/library`
                      : icon === "star"
                        ? `/${lang}/reviews`
                        : icon === "list"
                          ? `/${lang}/lists`
                          : account?.username
                            ? `/${lang}/u/${account.username}`
                            : `/${lang}/onboarding/username`;
                return (
                  <ActiveLink
                    key={label}
                    href={href}
                    aria-label={label}
                    title={label}
                  >
                    <NavIcon size={20} />
                    <span>{label}</span>
                  </ActiveLink>
                );
              }
              return (
                <ActiveLink
                  key={label}
                  href={`/${lang}`}
                  aria-label={label}
                  title={label}
                >
                  <NavIcon size={20} />
                  <span>{label}</span>
                </ActiveLink>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            {isAuthenticated ? (
              <Link
                href={`/${lang}/settings/profile`}
                aria-label={d.nav.settings}
                title={d.nav.settings}
              >
                <Settings size={20} />
                <span>{d.nav.settings}</span>
              </Link>
            ) : (
              <span
                className="nav-disabled"
                aria-disabled="true"
                title={d.actions.requiresSignIn}
              >
                <Settings size={20} />
                <span>{d.nav.settings}</span>
                <LockKeyhole className="nav-lock" size={12} />
              </span>
            )}
          </div>
        </div>
        {account ? (
          <AccountMenu account={account} lang={lang} />
        ) : (
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
        )}
      </aside>

      <header className="mobile-header">
        <MobileSidebar
          lang={lang}
          isAuthenticated={isAuthenticated}
          account={account}
          labels={{
            menu: d.actions.menu,
            close: d.actions.close,
            home: d.nav.home,
            explore: d.nav.explore,
            library: d.nav.library,
            reviews: d.nav.reviews,
            lists: d.nav.lists,
            profile: d.nav.profile,
            settings: d.nav.settings,
            signIn: d.actions.signIn,
            syncJourney: d.actions.syncJourney,
            requiresSignIn: d.actions.requiresSignIn,
          }}
        />
        <div className="mobile-header-actions">
          <LocaleSwitcher locale={lang} />
          <MobileGameSearch
            dictionary={d}
            lang={lang}
            cacheScope={searchCacheScope}
          />
        </div>
      </header>
    </>
  );
}
