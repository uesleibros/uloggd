import type { Metadata } from "next";
import { locales, type Locale } from "@/app/[lang]/dictionaries";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://uloggd.com"
).replace(/\/$/, "");

/**
 * The same content lives at /pt-BR, /en and /es. Without a canonical plus the
 * reciprocal hreflang set, a search engine sees three near-duplicate pages and
 * picks one on its own — usually not the one matching the reader's language.
 *
 * `path` is the part after the locale, always starting with "/" ("" for home).
 */
export function localeAlternates(
  lang: Locale,
  path: string,
): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `/${locale}${suffix}`]),
  ) as Record<string, string>;
  return {
    canonical: `/${lang}${suffix}`,
    languages: {
      ...languages,
      // Portuguese is the project's primary locale, so it answers for readers
      // whose language matches none of the three.
      "x-default": `/pt-BR${suffix}`,
    },
  };
}

/** JSON-LD, escaped so a name with "</script>" cannot break out of the tag. */
export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
