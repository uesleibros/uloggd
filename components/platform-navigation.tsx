import Link from "next/link";
import { LogIn } from "lucide-react";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { AccountMenu, type NavigationAccount } from "./account-menu";
import { Brand } from "./brand";
import { LocaleSwitcher } from "./locale-switcher";
import { MobileSidebar } from "./mobile-sidebar";
import { MobileGameSearch } from "./game-search";
import { SidebarCollapseButton } from "./sidebar-collapse-button";
import { SmartHeader } from "./smart-header";
import { NotificationCenter } from "./notifications/notification-center";
import { QuickCreateAction } from "./quick-create-action";
import { tri } from "@/lib/ui-text";
import {
  AdaptiveSidebarNavigation,
  type SidebarNavigationItem,
} from "./adaptive-sidebar-navigation";

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
  const libraryHref = account?.username
    ? `/${lang}/library/${account.username}`
    : `/${lang}/onboarding/username`;
  const reviewsHref = account?.username
    ? `/${lang}/reviews/${account.username}`
    : `/${lang}/onboarding/username`;
  const listsHref = account?.username
    ? `/${lang}/lists/${account.username}`
    : `/${lang}/onboarding/username`;

  const nav: SidebarNavigationItem[] = [
    {
      key: "home",
      icon: "home",
      label: d.nav.home,
      href: `/${lang}`,
      requiresAuth: false,
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
      href: libraryHref,
      requiresAuth: true,
    },
    {
      key: "user",
      icon: "profile",
      label: d.nav.profile,
      href: profileHref,
      requiresAuth: true,
    },
    {
      key: "star",
      icon: "star",
      label: d.nav.reviews,
      href: reviewsHref,
      requiresAuth: true,
    },
    {
      key: "list",
      icon: "list",
      label: d.nav.lists,
      href: listsHref,
      requiresAuth: true,
    },
    ...(account?.role === "ADMIN" || account?.role === "MODERATOR"
      ? [
          {
            key: "moderation",
            icon: "moderation" as const,
            label: tri(lang, "Moderação", "Moderation", "Moderación"),
            href: `/${lang}/moderation`,
            requiresAuth: true,
          },
        ]
      : []),
    {
      key: "settings",
      icon: "settings",
      label: d.nav.settings,
      href: `/${lang}/settings?tab=general`,
      requiresAuth: true,
    },
  ];

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-frame">
          <div className="sidebar-brand">
            <Brand lang={lang} />
          </div>

          <div className="sidebar-scroll">
            <AdaptiveSidebarNavigation
              items={nav}
              moreLabel={d.nav.more}
              navigationLabel={d.platform.navigation}
              isAuthenticated={isAuthenticated}
              pending={pending}
              requiresSignIn={d.actions.requiresSignIn}
            />

            <QuickCreateAction
              lang={lang}
              enabled={isAuthenticated && !pending}
              requiresSignIn={d.actions.requiresSignIn}
              listsHref={listsHref}
            />
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

      <QuickCreateAction
        lang={lang}
        enabled={isAuthenticated && !pending}
        mobile
        requiresSignIn={d.actions.requiresSignIn}
        listsHref={listsHref}
      />
    </>
  );
}
