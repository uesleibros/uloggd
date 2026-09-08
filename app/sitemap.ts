import type { MetadataRoute } from "next";
import { cachedCardData } from "@/lib/og-data";
import type { SiteIndex } from "@/lib/site-index-types";
import { locales } from "@/app/[lang]/dictionaries";
import { getPopularGames } from "@/lib/igdb";
import { SITE_URL } from "@/lib/seo";

const LEGAL_DOCUMENTS = ["terms", "privacy", "cookies", "child-safety"];
// The API origin belongs to a request; community data is cached separately.
export const dynamic = "force-dynamic";

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
    lastModified?: string | Date;
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

function uniqueEntries(entries: MetadataRoute.Sitemap) {
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const item of entries) {
    const previous = unique.get(item.url);
    unique.set(
      item.url,
      previous
        ? {
            ...previous,
            ...item,
            images: item.images ?? previous.images,
            lastModified: item.lastModified ?? previous.lastModified,
          }
        : item,
    );
  }
  return [...unique.values()];
}

type PublicProfile = {
  username: string;
  is_private: boolean | null;
  library_visibility: string | null;
};
type PublicJourney = { public_id: string; updated_at: string };

function joined<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getCommunitySitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await cachedCardData(["sitemap"], (api) =>
    api.get<SiteIndex>("/index"),
  );
  const reviewResult = { data: data.reviews },
    entryResult = { data: data.entries },
    listResult = { data: data.lists },
    screenshotResult = { data: data.screenshots };

  const profileDates = new Map<string, string>();
  const libraryDates = new Map<string, string>();
  const reviewDates = new Map<string, string>();
  const listDates = new Map<string, string>();
  const shotDates = new Map<string, string>();
  const paths: MetadataRoute.Sitemap = [];
  const rememberProfile = (
    profileValue: PublicProfile | PublicProfile[] | null,
    updatedAt: string,
  ) => {
    const profile = joined(profileValue);
    if (!profile?.username) return null;
    // A private account's own page shows nothing to a crawler, so listing it
    // spends crawl budget to serve an empty result and invites a soft-404.
    if (profile.is_private) return null;
    const current = profileDates.get(profile.username);
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      profileDates.set(profile.username, updatedAt);
    if (profile.library_visibility === "PUBLIC") {
      const libraryCurrent = libraryDates.get(profile.username);
      if (!libraryCurrent || Date.parse(updatedAt) > Date.parse(libraryCurrent))
        libraryDates.set(profile.username, updatedAt);
    }
    return profile.username;
  };
  const rememberCollection = (
    collection: Map<string, string>,
    profileValue: PublicProfile | PublicProfile[] | null,
    updatedAt: string,
  ) => {
    const username = rememberProfile(profileValue, updatedAt);
    if (!username) return;
    const current = collection.get(username);
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      collection.set(username, updatedAt);
  };

  const gameSlugs = new Map<string, string>();
  const rememberGame = (slug: string | null, updatedAt: string) => {
    if (!slug) return;
    const current = gameSlugs.get(slug);
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      gameSlugs.set(slug, updatedAt);
  };

  for (const review of reviewResult.data ?? []) {
    paths.push(
      ...entry(`/review/${review.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.6,
        lastModified: review.updated_at,
      }),
    );
    rememberCollection(reviewDates, review.profiles, review.updated_at);
    rememberGame(review.game_slug, review.updated_at);
  }

  const journeys = new Map<string, string>();
  for (const diaryEntry of entryResult.data ?? []) {
    paths.push(
      ...entry(`/entry/${diaryEntry.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.5,
        lastModified: diaryEntry.updated_at,
      }),
    );
    rememberCollection(reviewDates, diaryEntry.profiles, diaryEntry.updated_at);
    rememberGame(diaryEntry.game_slug, diaryEntry.updated_at);
    const journey = joined(
      diaryEntry.journeys as PublicJourney | PublicJourney[] | null,
    );
    if (!journey?.public_id) continue;
    const current = journeys.get(journey.public_id);
    const updatedAt =
      Date.parse(diaryEntry.updated_at) > Date.parse(journey.updated_at)
        ? diaryEntry.updated_at
        : journey.updated_at;
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      journeys.set(journey.public_id, updatedAt);
  }
  for (const [publicId, updatedAt] of journeys)
    paths.push(
      ...entry(`/journal/${publicId}`, {
        changeFrequency: "weekly",
        priority: 0.6,
        lastModified: updatedAt,
      }),
    );

  for (const shot of screenshotResult.data ?? []) {
    paths.push(
      ...entry(`/shot/${shot.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.4,
        lastModified: shot.created_at,
      }),
    );
    rememberCollection(shotDates, shot.profiles, shot.created_at);
    rememberGame(shot.game_slug, shot.created_at);
  }

  for (const list of listResult.data ?? []) {
    paths.push(
      ...entry(`/lists/${list.public_id}`, {
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: list.updated_at,
      }),
    );
    rememberCollection(listDates, list.profiles, list.updated_at);
  }
  // Games somebody actually wrote about. The shell already lists the popular
  // ones from the catalogue, but those are the same for every site using IGDB;
  // these are the pages that carry writing found nowhere else, which is the
  // only reason a crawler should prefer this site's copy.
  for (const [slug, updatedAt] of gameSlugs)
    paths.push(
      ...entry(`/game/${slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        lastModified: updatedAt,
      }),
    );
  for (const [username, updatedAt] of profileDates) {
    paths.push(
      ...entry(`/u/${username}`, {
        changeFrequency: "weekly",
        priority: 0.6,
        lastModified: updatedAt,
      }),
      ...entry(`/wallet/${username}`, {
        changeFrequency: "weekly",
        priority: 0.3,
        lastModified: updatedAt,
      }),
    );
  }
  for (const [username, updatedAt] of libraryDates)
    paths.push(
      ...entry(`/library/${username}`, {
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: updatedAt,
      }),
    );
  for (const [username, updatedAt] of reviewDates)
    paths.push(
      ...entry(`/reviews/${username}`, {
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: updatedAt,
      }),
    );
  for (const [username, updatedAt] of listDates)
    paths.push(
      ...entry(`/lists/${username}`, {
        changeFrequency: "weekly",
        priority: 0.4,
        lastModified: updatedAt,
      }),
    );
  for (const [username, updatedAt] of shotDates)
    paths.push(
      ...entry(`/shots/${username}`, {
        changeFrequency: "weekly",
        priority: 0.4,
        lastModified: updatedAt,
      }),
    );
  return paths;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shell = [
    ...entry("/", { changeFrequency: "daily", priority: 1 }),
    ...entry("/search", { changeFrequency: "daily", priority: 0.8 }),
    ...entry("/verification", {
      changeFrequency: "monthly",
      priority: 0.4,
    }),
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
  const [games, community] = await Promise.all([
    getPopularGames().catch(() => []),
    getCommunitySitemap().catch((error: unknown) => {
      console.warn(
        `[sitemap] community omitted (${error instanceof Error ? error.name : "unknown"})`,
      );
      return [];
    }),
  ]);
  // The studios and publishers behind those games. The comment above calls the
  // game pages the crawl entry point because each one links to its company,
  // but the companies themselves were never listed, so a crawler could only
  // reach them by following a link and had no reason to revisit. The slugs
  // ride along on the games already fetched, so this costs no request.
  const companySlugs = [
    ...new Set(games.flatMap((game) => game.companySlugs)),
  ].sort();
  return uniqueEntries([
    ...shell,
    ...games.flatMap((game) =>
      entry(`/game/${game.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        images: [game.coverUrl],
      }),
    ),
    ...companySlugs.flatMap((slug) =>
      entry(`/company/${slug}`, {
        changeFrequency: "monthly",
        priority: 0.5,
      }),
    ),
    ...community,
  ]);
}
