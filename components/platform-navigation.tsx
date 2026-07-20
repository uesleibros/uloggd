import Link from "next/link";
import { Tooltip } from "@/components/ui/tooltip";
import {
  HomeIcon,
  LibraryBig,
  ListTree,
  LogIn,
  LockKeyhole,
  Search,
  Settings,
  ShieldCheck,
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
import { SmartHeader } from "./smart-header";
import { NotificationCenter } from "./notifications/notification-center";

const iconMap = {
  home: HomeIcon,
  library: LibraryBig,
  star: Star,
  user: UserRound,
  list: ListTree,
  search: Search,
};

export function PlatformNavigation({
  lang,
  dictionary: d,
  account,
  searchCacheScope,
  viewerId,
  pending = false,
}: {
  lang: Locale;
  dictionary: Dictionary;
  account: NavigationAccount | null;
  searchCacheScope: string;
  viewerId: string | null;
  pending?: boolean;
}) {
  const isAuthenticated = Boolean(account);
  const nav = [
    ["home", d.nav.home, false],
    ["search", d.platform.search, false],
    ["library", d.nav.library, true],
    ["star", d.nav.reviews, true],
    ["list", d.nav.lists, true],
    ["user", d.nav.profile, true],
  ] as const;

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-frame">
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
                    <Tooltip
                      key={label}
                      side="right"
                      label={pending ? label : d.actions.requiresSignIn}
                    >
                      <span className="nav-disabled" aria-disabled="true">
                        <NavIcon size={20} />
                        <span>{label}</span>
                        {!pending && (
                          <LockKeyhole className="nav-lock" size={12} />
                        )}
                      </span>
                    </Tooltip>
                  );
                }
                if (index !== 0) {
                  const href =
                    icon === "search"
                      ? `/${lang}/search`
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
                    <Tooltip key={label} label={label} side="right">
                      <ActiveLink href={href} aria-label={label}>
                        <NavIcon size={20} />
                        <span>{label}</span>
                      </ActiveLink>
                    </Tooltip>
                  );
                }
                return (
                  <Tooltip key={label} label={label} side="right">
                    <ActiveLink href={`/${lang}`} aria-label={label}>
                      <NavIcon size={20} />
                      <span>{label}</span>
                    </ActiveLink>
                  </Tooltip>
                );
              })}
            </nav>
            <div className="sidebar-bottom">
              {isAuthenticated ? (
                <>
                  {(account?.role === "ADMIN" ||
                    account?.role === "MODERATOR") && (
                    <Tooltip
                      side="right"
                      label={lang === "pt-BR" ? "Moderação" : "Moderation"}
                    >
                      <ActiveLink
                        href={`/${lang}/moderation`}
                        aria-label={
                          lang === "pt-BR" ? "Moderação" : "Moderation"
                        }
                      >
                        <ShieldCheck size={20} />
                        <span>
                          {lang === "pt-BR" ? "Moderação" : "Moderation"}
                        </span>
                      </ActiveLink>
                    </Tooltip>
                  )}
                  <Tooltip side="right" label={d.nav.settings}>
                    <ActiveLink
                      href={`/${lang}/settings?tab=general`}
                      aria-label={d.nav.settings}
                    >
                      <Settings size={20} />
                      <span>{d.nav.settings}</span>
                    </ActiveLink>
                  </Tooltip>
                </>
              ) : (
                <Tooltip
                  side="right"
                  label={pending ? d.nav.settings : d.actions.requiresSignIn}
                >
                  <span className="nav-disabled" aria-disabled="true">
                    <Settings size={20} />
                    <span>{d.nav.settings}</span>
                    {!pending && <LockKeyhole className="nav-lock" size={12} />}
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
          {pending ? (
            <div className="account-button account-slot-skeleton" aria-hidden>
              <span className="skeleton-block" />
              <div>
                <span className="skeleton-block" />
                <span className="skeleton-block" />
              </div>
            </div>
          ) : account ? (
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
        </div>
      </aside>
      <SidebarCollapseButton lang={lang} />

      <SmartHeader className="mobile-header">
        <MobileSidebar
          lang={lang}
          isAuthenticated={isAuthenticated}
          account={account}
          labels={{
            menu: d.actions.menu,
            close: d.actions.close,
            home: d.nav.home,
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
          {viewerId && (
            <NotificationCenter
              viewerId={viewerId}
              lang={lang}
              labels={d.notifications}
            />
          )}
          <LocaleSwitcher locale={lang} />
          <MobileGameSearch
            dictionary={d}
            lang={lang}
            cacheScope={searchCacheScope}
          />
        </div>
      </SmartHeader>
    </>
  );
}
