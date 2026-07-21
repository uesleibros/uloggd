import Link from "next/link";
import { Tooltip } from "@/components/ui/tooltip";
import {
  HomeIcon,
  Rss,
  LibraryBig,
  ListTree,
  LogIn,
  LockKeyhole,
  Search,
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
import { SmartHeader } from "./smart-header";
import { NotificationCenter } from "./notifications/notification-center";
import { NavMoreMenu } from "./nav-more-menu";
import { tri } from "@/lib/ui-text";

const iconMap = {
  home: HomeIcon,
  feed: Rss,
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
  const profileHref = account?.username
    ? `/${lang}/u/${account.username}`
    : `/${lang}/onboarding/username`;
  // Five primary destinations; everything else lives behind "More", so the
  // rail stays short no matter how many secondary pages exist.
  const nav = [
    {
      key: "home",
      icon: "home",
      label: d.nav.home,
      href: `/${lang}`,
      requiresAuth: false,
    },
    {
      key: "feed",
      icon: "feed",
      label: d.nav.feed,
      href: `/${lang}/feed`,
      requiresAuth: true,
    },
    {
      key: "search",
      icon: "search",
      label: d.platform.search,
      href: `/${lang}/search`,
      requiresAuth: false,
    },
    {
      key: "library",
      icon: "library",
      label: d.nav.library,
      href: `/${lang}/library`,
      requiresAuth: true,
    },
    {
      key: "user",
      icon: "user",
      label: d.nav.profile,
      href: profileHref,
      requiresAuth: true,
    },
  ] as const;
  // Kept visible signed-out too: hiding these would mean a visitor never
  // learns the features exist. The proxy sends them through login first.
  const moreItems = [
    { key: "star", label: d.nav.reviews, href: `/${lang}/reviews` },
    { key: "list", label: d.nav.lists, href: `/${lang}/lists` },
    ...(account?.role === "ADMIN" || account?.role === "MODERATOR"
      ? [
          {
            key: "moderation",
            label: tri(lang, "Moderação", "Moderation", "Moderación"),
            href: `/${lang}/moderation`,
          },
        ]
      : []),
    ...(isAuthenticated
      ? [
          {
            key: "settings",
            label: d.nav.settings,
            href: `/${lang}/settings?tab=general`,
          },
        ]
      : []),
  ];

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
              {nav.map((item) => {
                const NavIcon = iconMap[item.icon];
                if (item.requiresAuth && !isAuthenticated) {
                  return (
                    <Tooltip
                      key={item.key}
                      side="right"
                      label={pending ? item.label : d.actions.requiresSignIn}
                    >
                      <span className="nav-disabled" aria-disabled="true">
                        <NavIcon size={20} />
                        <span>{item.label}</span>
                        {!pending && (
                          <LockKeyhole className="nav-lock" size={12} />
                        )}
                      </span>
                    </Tooltip>
                  );
                }
                return (
                  <Tooltip key={item.key} label={item.label} side="right">
                    <ActiveLink href={item.href} aria-label={item.label}>
                      <NavIcon size={20} />
                      <span>{item.label}</span>
                    </ActiveLink>
                  </Tooltip>
                );
              })}
              <NavMoreMenu items={moreItems} label={d.nav.more} />
            </nav>
            {/* Settings and moderation moved into the "More" menu above; a
                signed-out visitor still gets the locked hint here. */}
            {!isAuthenticated && (
              <div className="sidebar-bottom">
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
              </div>
            )}
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
            feed: d.nav.feed,
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
