import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { CollapseAppSidebar } from "@/components/docs/collapse-app-sidebar";
import { DocsThemeBridge } from "@/components/docs/theme-bridge";
import { source } from "@/lib/docs/source";
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
    <RootProvider i18n={{ locale: lang }} theme={{ enabled: false }}>
      <DocsThemeBridge />
      <CollapseAppSidebar />
      <DocsLayout tree={source.pageTree[lang]} nav={{ enabled: false }}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
