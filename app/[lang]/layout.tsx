import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { PlatformNavigation } from "@/components/platform-navigation";
import { DesktopGameSearch } from "@/components/game-search";
import { PlatformFooter } from "@/components/platform-footer";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { CookieConsent } from "@/components/cookie-consent";
import { SmartHeader } from "@/components/smart-header";
import { ThemeManager } from "@/components/theme-manager";
import { themeBootstrapScript } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, hasLocale, locales } from "./dictionaries";
import "../globals.css";
import "react-image-crop/dist/ReactCrop.css";

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

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dictionary, supabase] = await Promise.all([
    getDictionary(lang),
    process.env.ULOGGD_E2E === "1" ? null : createClient(),
  ]);
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const { data: profile } =
    user && supabase
      ? await supabase
          .from("profiles")
          .select("username,display_name,avatar_url,verified")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };

  return (
    <html lang={lang} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          id="uloggd-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
      </head>
      <body>
        <ThemeManager />
        <div className="platform-shell">
          <PlatformNavigation
            lang={lang}
            dictionary={dictionary}
            searchCacheScope={user?.id ?? "anonymous"}
            account={
              user
                ? {
                    email: user.email ?? "",
                    username: profile?.username ?? null,
                    displayName: profile?.display_name ?? null,
                    avatarUrl: profile?.avatar_url ?? null,
                    verified: profile?.verified ?? false,
                  }
                : null
            }
          />
          <div className="platform-content">
            <SmartHeader className="content-header">
              <DesktopGameSearch
                dictionary={dictionary}
                lang={lang}
                cacheScope={user?.id ?? "anonymous"}
              />
              <LocaleSwitcher locale={lang} />
            </SmartHeader>
            {children}
            <PlatformFooter lang={lang} dictionary={dictionary} />
          </div>
          <CookieConsent lang={lang} />
        </div>
      </body>
    </html>
  );
}
