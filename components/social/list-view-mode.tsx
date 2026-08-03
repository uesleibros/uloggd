import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

export function ListViewMode({
  href,
  editing,
  lang,
}: {
  href: string;
  editing: boolean;
  lang: UiLang;
}) {
  return (
    <nav
      className="list-view-mode"
      aria-label={tri(lang, "Modo da lista", "List mode", "Modo de la lista")}
    >
      <Link
        href={href}
        replace
        scroll={false}
        aria-current={!editing ? "page" : undefined}
      >
        <Eye size={14} aria-hidden />
        {tri(lang, "Visualizar", "View", "Visualizar")}
      </Link>
      <Link
        href={`${href}?edit=1`}
        replace
        scroll={false}
        aria-current={editing ? "page" : undefined}
      >
        <Pencil size={14} aria-hidden />
        {tri(lang, "Editar", "Edit", "Editar")}
      </Link>
    </nav>
  );
}
