import type { MetadataRoute } from "next";
import { locales } from "@/app/[lang]/dictionaries";
import { getPopularGames } from "@/lib/igdb";
import { SITE_URL } from "@/lib/seo";

const LEGAL_DOCUMENTS = ["terms", "privacy", "cookies", "child-safety"];

/**
 * Every entry ships the full hreflang set, so a crawler that finds the English
 * URL learns about the Portuguese and Spanish ones without crawling for them.
 */
function entry(
  path: string,
  options: {
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
    images?: string[];
  },
): MetadataRoute.Sitemap {
  const suffix = path === "/" ? "" : path;
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${SITE_URL}/${locale}${suffix}`]),
  );
  languages["x-default"] = `${SITE_URL}/pt-BR${suffix}`;
  return locales.map((locale) => ({
    url: `${SITE_URL}/${locale}${suffix}`,
    alternates: { languages },
    ...options,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shell = [
    ...entry("/", { changeFrequency: "daily", priority: 1 }),
    ...entry("/search", { changeFrequency: "daily", priority: 0.8 }),
    ...LEGAL_DOCUMENTS.flatMap((document) =>
      entry(`/legal/${document}`, {
        changeFrequency: "yearly",
        priority: 0.2,
      }),
    ),
  ];
  // Game pages are the crawl entry point for everything else: each one links to
  // its publisher, and IGDB is already cached for this list. A failure here
  // must not take the whole sitemap down.
  const games = await getPopularGames().catch(() => []);
  return [
    ...shell,
    ...games.flatMap((game) =>
      entry(`/game/${game.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        images: [game.coverUrl],
      }),
    ),
  ];
}
