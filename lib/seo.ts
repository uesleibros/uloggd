import type { Metadata } from "next";
import { locales, type Locale } from "@/app/[lang]/dictionaries";

const vercelProductionHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

// An explicit origin wins. On Vercel, fall back to the project's production
// custom domain instead of the branch/deployment URL so canonicals, sitemap
// entries and social cards all agree. The site is uloggd.com; the comment here
// used to say dev.uloggd.com, from when it was still closed.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (vercelProductionHost
    ? `https://${vercelProductionHost}`
    : "https://uloggd.com")
).replace(/\/$/, "");

/**
 * The same content lives at /pt-BR, /en and /es. Without a canonical plus the
 * reciprocal hreflang set, a search engine sees three near-duplicate pages and
 * picks one on its own, usually not the one matching the reader's language.
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
