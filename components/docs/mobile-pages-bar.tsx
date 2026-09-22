"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "fumadocs-ui/layouts/docs/slots/sidebar";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The way into the other pages of the API reference, on a phone.
 *
 * fumadocs keeps its page list in a drawer below the tablet width and opens it
 * from its own top bar. That bar is switched off here, because the site already
 * has a header and two stacked ones would be one too many, and with it went
 * the only button that opened the drawer: on a phone the reference was one
 * page with no way to reach Autenticação, Escopos or any other. This is that
 * button, in the site's own style, and nothing else.
 */
export function DocsMobilePagesBar({ lang }: { lang: UiLang }) {
  return (
    <div className="docs-mobile-pages">
      <SidebarTrigger className="docs-mobile-pages-trigger">
        <BookOpen size={16} aria-hidden />
        <span>
          {tri(lang, "Páginas da API", "API pages", "Páginas de la API")}
        </span>
        <ChevronDown size={15} aria-hidden />
      </SidebarTrigger>
    </div>
  );
}
