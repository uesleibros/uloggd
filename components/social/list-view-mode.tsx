"use client";

import { Eye, Pencil } from "lucide-react";
import { ShallowLink } from "@/components/shallow-link";
import { useListEditing } from "@/components/social/list-mode";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * View or edit, for the owner of a list.
 *
 * A change of address and nothing else: the parts of the page that differ read
 * the mode themselves (see useListEditing), and what editing needs beyond what
 * is already on screen, the owner's library for adding games, is fetched by
 * the part that needs it the first time it is opened.
 */
export function ListViewMode({ href, lang }: { href: string; lang: UiLang }) {
  const editing = useListEditing();
  return (
    <nav
      className="list-view-mode"
      aria-label={tri(lang, "Modo da lista", "List mode", "Modo de la lista")}
    >
      <ShallowLink
        href={href}
        replace
        aria-current={!editing ? "page" : undefined}
      >
        <Eye size={14} aria-hidden />
        {tri(lang, "Visualizar", "View", "Visualizar")}
      </ShallowLink>
      <ShallowLink
        href={`${href}?edit=1`}
        replace
        aria-current={editing ? "page" : undefined}
      >
        <Pencil size={14} aria-hidden />
        {tri(lang, "Editar", "Edit", "Editar")}
      </ShallowLink>
    </nav>
  );
}
