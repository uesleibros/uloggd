import Link from "next/link";
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
}: {
  lang: UiLang;
  active: SearchScope;
  query?: string;
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
      label: tri(lang, "Reviews", "Reviews", "Reseñas"),
    },
    {
      id: "lists" as const,
      icon: Layers3,
      label: tri(lang, "Listas", "Lists", "Listas"),
    },
    { id: "tierlists" as const, icon: ListOrdered, label: "Tier lists" },
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
        return (
          <Link
            key={tab.id}
            href={`/${lang}/search${params.size ? `?${params}` : ""}`}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <Icon size={15} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
