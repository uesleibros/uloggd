import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlatformNavigation } from "@/components/platform-navigation";
import { DesktopGameSearch } from "@/components/game-search";
import { PlatformFooter } from "@/components/platform-footer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CookieConsent } from "@/components/cookie-consent";
import { CommentAnchor } from "@/components/comment-anchor";
import { ScrollReset } from "@/components/scroll-reset";
import { SmartHeader } from "@/components/smart-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeManager } from "@/components/theme-manager";
import { TwemojiManager } from "@/components/twemoji-manager";
import { TextareaAutosizeManager } from "@/components/textarea-autosize-manager";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { themeBootstrapScript } from "@/lib/theme";
import { getAuthUser, getNavigationAccount } from "@/lib/supabase/auth";
import {
  getDictionary,
  hasLocale,
  locales,
  type Dictionary,
  type Locale,
} from "./dictionaries";
import "../globals.css";
import "./profile.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "pt-BR";
  const dictionary = await getDictionary(locale);
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://uloggd.com",
    ),
    title: { default: "uloggd", template: "%s · uloggd" },
    description: dictionary.home.subtitle,
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// Auth reads cookies, so it stays behind Suspense to keep the static shell
// and route loading skeletons streaming immediately on hard loads.
async function AuthedNavigation({
  lang,
  dictionary,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  const [user, account] = await Promise.all([
    getAuthUser(),
    getNavigationAccount(),
  ]);
  return (
    <PlatformNavigation
      lang={lang}
      dictionary={dictionary}
      searchCacheScope={user?.id ?? "anonymous"}
      account={account}
      viewerId={user?.id ?? null}
    />
  );
}

async function AuthedHeaderTools({
  lang,
  dictionary,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  const user = await getAuthUser();
  return (
    <>
      <DesktopGameSearch
        dictionary={dictionary}
        lang={lang}
        cacheScope={user?.id ?? "anonymous"}
      />
      <div className="content-header-actions">
        {user && (
          <NotificationCenter
            viewerId={user.id}
            lang={lang}
            labels={dictionary.notifications}
          />
        )}
        <LocaleSwitcher locale={lang} />
      </div>
    </>
  );
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dictionary = await getDictionary(lang);

  return (
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          id="uloggd-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <ScrollReset />
        <CommentAnchor />
        <ThemeManager />
        <TwemojiManager />
        <TextareaAutosizeManager />
        <TooltipProvider>
          <div className="platform-shell">
            <Suspense
              fallback={
                <PlatformNavigation
                  lang={lang}
                  dictionary={dictionary}
                  searchCacheScope="anonymous"
                  account={null}
                  viewerId={null}
                  pending
                />
              }
            >
              <AuthedNavigation lang={lang} dictionary={dictionary} />
            </Suspense>
            <div className="platform-content">
              <SmartHeader className="content-header">
                <Suspense
                  fallback={
                    <>
                      <DesktopGameSearch
                        dictionary={dictionary}
                        lang={lang}
                        cacheScope="anonymous"
                      />
                      <div className="content-header-actions">
                        <LocaleSwitcher locale={lang} />
                      </div>
                    </>
                  }
                >
                  <AuthedHeaderTools lang={lang} dictionary={dictionary} />
                </Suspense>
              </SmartHeader>
              {children}
              <PlatformFooter lang={lang} dictionary={dictionary} />
            </div>
            <CookieConsent lang={lang} />
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
