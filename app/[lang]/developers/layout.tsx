import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsThemeBridge } from "@/components/docs/theme-bridge";
import { source } from "@/lib/docs/source";
import { docsUiStrings } from "@/lib/docs/ui-strings";
import type { UiLang } from "@/lib/ui-text";
import "fumadocs-ui/style.css";
import "./developers.css";

export default async function DevelopersLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return (
    <RootProvider
      i18n={{ locale: lang, translations: docsUiStrings(lang as UiLang) }}
      // No theme control of its own: the site already has one, and two would
      // be two answers to the same question. No search either, which never
      // worked here: the dialog posts to /api/search and nothing answers it.
      theme={{ enabled: false }}
      search={{ enabled: false }}
    >
      <DocsThemeBridge />
      <div className="docs-shell">
        <DocsLayout
          tree={source.pageTree[lang]}
          nav={{ enabled: false }}
          themeSwitch={{ enabled: false }}
          sidebar={{ collapsible: false }}
        >
          {children}
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
