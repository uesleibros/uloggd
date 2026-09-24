import Link from "next/link";
import { ShallowLink } from "@/components/shallow-link";
import {
  Building2,
  Gamepad2,
  Layers3,
  ListOrdered,
  Users,
  PenLine,
} from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

export type SearchScope =
  "games" | "reviews" | "lists" | "tierlists" | "people" | "companies";

export function SearchScopeTabs({
  lang,
  active,
  query,
  serverScope,
}: {
  lang: UiLang;
  active: SearchScope;
  query?: string;
  /**
   * Which scope the server drew this page for. Everything else can be swapped
   * in the browser, so those tabs only move the address; games carries filter
   * lists the server reads from IGDB, so it is a real navigation unless the
   * page already arrived with them.
   */
  serverScope?: SearchScope;
}) {
  const tabs = [
    {
      id: "games" as const,
      icon: Gamepad2,
      label: tri(lang, "Jogos", "Games", "Juegos"),
    },
    {
      // Second, ahead of lists. There are three hundred and seventy-six
      // reviews here and thirty-nine lists, and until now the reviews had
      // nowhere to be read.
      id: "reviews" as const,
      icon: PenLine,
      label: tri(lang, "Avaliações", "Reviews", "Reseñas"),
    },
    {
      id: "lists" as const,
      icon: Layers3,
      label: tri(lang, "Listas", "Lists", "Listas"),
    },
    { id: "tierlists" as const, icon: ListOrdered, label: "Tierlists" },
    {
      id: "people" as const,
      icon: Users,
      label: tri(lang, "Pessoas", "People", "Personas"),
    },
    {
      id: "companies" as const,
      icon: Building2,
      label: tri(lang, "Empresas", "Companies", "Empresas"),
    },
  ];
  return (
    <nav
      className="game-page-nav search-scope-tabs"
      aria-label={tri(lang, "Tipo de busca", "Search type", "Tipo de búsqueda")}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const params = new URLSearchParams();
        if (tab.id !== "games") params.set("scope", tab.id);
        if (query) params.set("q", query);
        const href = `/${lang}/search${params.size ? `?${params}` : ""}`;
        const shallow =
          serverScope !== undefined &&
          (tab.id !== "games" || serverScope === "games");
        const Anchor = shallow ? ShallowLink : Link;
        return (
          <Anchor
            key={tab.id}
            href={href}
            // Never in advance. A tab that is a real navigation is one the
            // reader may never take, and prefetching it had every other tab
            // quietly asking the server to render the catalogue.
            prefetch={false}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <Icon size={15} />
            {tab.label}
          </Anchor>
        );
      })}
    </nav>
  );
}
