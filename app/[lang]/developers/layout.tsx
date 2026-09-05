import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsTabs } from "@/components/docs/docs-tabs";
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
      theme={{ enabled: false }}
    >
      <DocsThemeBridge />
      <div className="docs-shell">
        <DocsTabs lang={lang as UiLang} />
        {/* The rail is off. The site owns the one on the left, and the tabs
            above carry the reference's own navigation, so what is left for
            fumadocs to lay out is the article and its table of contents. */}
        <DocsLayout
          tree={source.pageTree[lang]}
          nav={{ enabled: false }}
          sidebar={{ enabled: false }}
        >
          {children}
        </DocsLayout>
      </div>
    </RootProvider>
  );
}
