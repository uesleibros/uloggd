import { tri, type UiLang } from "@/lib/ui-text";

/**
 * What kind of organization an account represents.
 *
 * Lives here rather than beside the settings editor because the profile page is
 * a server component: importing a plain function out of a `"use client"` module
 * turns it into a client reference, and calling it during a server render fails
 * at runtime while typechecking perfectly.
 *
 * A fixed list rather than free text, so an account cannot describe itself as
 * something the interface then has to take at face value, and so surfaces can
 * style and filter on it.
 */
export type OrganizationCategory =
  "STORE" | "STUDIO" | "PUBLISHER" | "OUTLET" | "COMMUNITY" | "OTHER";

export const ORGANIZATION_CATEGORIES: OrganizationCategory[] = [
  "STORE",
  "STUDIO",
  "PUBLISHER",
  "OUTLET",
  "COMMUNITY",
  "OTHER",
];

export function categoryLabel(
  category: OrganizationCategory,
  lang: UiLang,
): string {
  switch (category) {
    case "STORE":
      return tri(lang, "Loja", "Store", "Tienda");
    case "STUDIO":
      return tri(lang, "Estúdio", "Studio", "Estudio");
    case "PUBLISHER":
      return tri(lang, "Publicadora", "Publisher", "Editora");
    case "OUTLET":
      return tri(lang, "Veículo", "Outlet", "Medio");
    case "COMMUNITY":
      return tri(lang, "Comunidade", "Community", "Comunidad");
    case "OTHER":
      return tri(lang, "Outro", "Other", "Otro");
  }
}

/** Strips the scheme for display, since `https://` is noise in a profile line. */
export function displayUrl(url: string) {
  return url.replace(/^https:\/\//, "").replace(/\/$/, "");
}
