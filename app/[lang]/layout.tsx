import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Next,
  Inter,
  Source_Sans_3,
  Source_Serif_4,
} from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlatformNavigation } from "@/components/platform-navigation";
import { DesktopGameSearch } from "@/components/game-search";
import { PlatformFooter } from "@/components/platform-footer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CookieConsent } from "@/components/cookie-consent";
import { CommentAnchor } from "@/components/comment-anchor";
import { ClientErrorReporter } from "@/components/client-error-reporter";
import { ScrollReset } from "@/components/scroll-reset";
import { TopProgress } from "@/components/top-progress";
import { SmartHeader } from "@/components/smart-header";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeManager } from "@/components/theme-manager";
import { ServiceWorkerManager } from "@/components/service-worker-manager";
import { InterfacePreferencesManager } from "@/components/interface-preferences-manager";
import { TwemojiManager } from "@/components/twemoji-manager";
import { TextareaAutosizeManager } from "@/components/textarea-autosize-manager";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { themeBootstrapScript } from "@/lib/theme";
import { interfacePreferencesBootstrapScript } from "@/lib/interface-preferences";
import { jsonLd, SITE_URL } from "@/lib/seo";
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
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});
const readable = Atkinson_Hyperlegible_Next({
  variable: "--font-readable",
  subsets: ["latin"],
  adjustFontFallback: false,
});
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "pt-BR";
  const dictionary = await getDictionary(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: "uloggd", template: "%s · uloggd" },
    description: dictionary.home.subtitle,
    applicationName: "uloggd",
    authors: [{ name: "uloggd", url: SITE_URL }],
    creator: "uloggd",
    publisher: "uloggd",
    keywords: [
      "uloggd",
      "game journal",
      "gaming community",
      "game reviews",
      "game library",
    ],
    category: "games",
    referrer: "origin-when-cross-origin",
    formatDetection: { address: false, email: false, telephone: false },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: "uloggd",
      title: "uloggd",
      description: dictionary.home.subtitle,
      url: `/${locale}`,
      locale:
        locale === "pt-BR" ? "pt_BR" : locale === "en" ? "en_US" : "es_ES",
      images: [{ url: "/logo.jpg", width: 1280, height: 1280, alt: "uloggd" }],
    },
    twitter: {
      card: "summary",
      title: "uloggd",
      description: dictionary.home.subtitle,
      images: ["/logo.jpg"],
    },
    // iOS ignores the web manifest for standalone display and home screen
    // icons, so the same intent has to be stated again here or an install on
    // iPhone opens in a Safari tab with browser chrome.
    appleWebApp: {
      capable: true,
      title: "uloggd",
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/**
 * `viewport-fit: cover` is what lets a bottom sheet reach the physical bottom
 * of a phone screen instead of stopping above the gesture bar. Without it the
 * viewport ends at the system inset and every `env(safe-area-inset-*)` in the
 * stylesheet resolves to zero, the sheets, drawers and sticky footers here
 * were all written expecting those insets, so they were compensating for
 * something that never reported a value.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Paints the system bars to match the app instead of leaving a white strip
  // above an installed window. Both schemes are listed because the site has a
  // light theme and a single value would be wrong in one of them.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0a0d" },
    { media: "(prefers-color-scheme: light)", color: "#e3e5e9" },
  ],
};

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
    <html
      lang={lang}
      className={`${inter.variable} ${sourceSans.variable} ${readable.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          The manifest is a static file with a hand-written link, rather than
          `app/manifest.ts` and the link Next generates from it.

          Two things needed changing and neither is expressible through the
          Metadata API. A manifest is fetched without credentials by default, so
          behind a protection layer that expects a clearance cookie the request
          is challenged even though the visitor already passed the challenge;
          Next hardcodes `use-credentials` for Vercel preview deployments, which
          have exactly this problem, and offers no way to ask for it elsewhere.
          And a file in `public/` reaches the edge as a plain asset rather than
          as a route, which is what caches and protection rules treat most
          predictably.

          The symptom either way is the same and gives nothing away: the browser
          reports an empty manifest and silently declines to offer installing.
        */}
        <link
          rel="manifest"
          href="/manifest.json"
          crossOrigin="use-credentials"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "uloggd",
                url: SITE_URL,
                logo: {
                  "@type": "ImageObject",
                  url: `${SITE_URL}/logo.jpg`,
                  width: 1280,
                  height: 1280,
                },
              },
              {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "uloggd",
                alternateName: "Uloggd",
                inLanguage: lang,
                publisher: { "@id": `${SITE_URL}/#organization` },
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${SITE_URL}/${lang}/search?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ],
          })}
        />
        <script
          id="uloggd-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <script
          id="uloggd-interface-preferences-bootstrap"
          dangerouslySetInnerHTML={{
            __html: interfacePreferencesBootstrapScript,
          }}
        />
      </head>
      <body>
        <TopProgress />
        <ClientErrorReporter />
        <ScrollReset />
        <CommentAnchor />
        <ThemeManager />
        <InterfacePreferencesManager />
        <TwemojiManager />
        <ServiceWorkerManager />
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
