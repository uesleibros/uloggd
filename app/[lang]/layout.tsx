import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { PlatformNavigation } from "@/components/platform-navigation";
import { DesktopGameSearch } from "@/components/game-search";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, hasLocale, locales } from "./dictionaries";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = hasLocale(lang) ? lang : "pt-BR";
  const dictionary = await getDictionary(locale);
  return {
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
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div className="platform-shell">
          <PlatformNavigation
            lang={lang}
            dictionary={dictionary}
            isAuthenticated={Boolean(user)}
          />
          <div className="platform-content">
            <header className="content-header">
              <DesktopGameSearch dictionary={dictionary} />
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
