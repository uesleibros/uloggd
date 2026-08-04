import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { locales } from "@/app/[lang]/dictionaries";
import { getPopularGames } from "@/lib/igdb";
import { SITE_URL } from "@/lib/seo";

const LEGAL_DOCUMENTS = ["terms", "privacy", "cookies", "child-safety"];
export const revalidate = 3600;

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

type PublicProfile = { username: string; is_private: boolean | null };
type PublicJourney = { public_id: string; updated_at: string };

function joined<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getCommunitySitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const [
    reviewResult,
    entryResult,
    listResult,
    screenshotResult,
    moderationResult,
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "public_id,profile_id,game_slug,updated_at,profiles!reviews_profile_id_fkey(username,is_private)",
      )
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("diary_entries")
      .select(
        "public_id,profile_id,game_slug,updated_at,journey_id,profiles!diary_entries_profile_id_fkey(username,is_private),journeys!diary_entries_journey_id_fkey(public_id,updated_at)",
      )
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("game_lists")
      .select(
        "public_id,profile_id,updated_at,profiles!game_lists_profile_id_fkey(username,is_private)",
      )
      .eq("visibility", "PUBLIC")
      .order("updated_at", { ascending: false })
      .limit(1000),
    supabase
      .from("screenshots")
      .select(
        "public_id,profile_id,game_slug,created_at,profiles!screenshots_profile_id_fkey(username,is_private)",
      )
      .eq("visibility", "PUBLIC")
      .is("deleted_at", null)
      // Covered pictures are indexable as pages and must not be advertised
      // with an image: a crawler that pulls the file has undone the cover.
      .eq("sensitive", false)
      .order("created_at", { ascending: false })
      .limit(1000),
    process.env.SUPABASE_SECRET_KEY
      ? supabase
          .from("profile_moderation_state")
          .select("profile_id,banned_until")
          .limit(1000)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const [source, error] of [
    ["reviews", reviewResult.error],
    ["entries", entryResult.error],
    ["lists", listResult.error],
    ["screenshots", screenshotResult.error],
    ["moderation", moderationResult.error],
  ] as const) {
    if (error)
      console.warn(`[sitemap] ${source} omitted (${error.code || "unknown"})`);
  }

  const profileDates = new Map<string, string>();
  const paths: MetadataRoute.Sitemap = [];
  const now = Date.now();
  const suspendedProfiles = new Set(
    (moderationResult.data ?? [])
      .filter(
        (state) => !state.banned_until || Date.parse(state.banned_until) > now,
      )
      .map((state) => state.profile_id),
  );
  const rememberProfile = (
    profileValue: PublicProfile | PublicProfile[] | null,
    updatedAt: string,
  ) => {
    const profile = joined(profileValue);
    if (!profile?.username) return;
    // A private account's own page shows nothing to a crawler, so listing it
    // spends crawl budget to serve an empty result and invites a soft-404.
    if (profile.is_private) return;
    const current = profileDates.get(profile.username);
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      profileDates.set(profile.username, updatedAt);
  };

  const gameSlugs = new Map<string, string>();
  const rememberGame = (slug: string | null, updatedAt: string) => {
    if (!slug) return;
    const current = gameSlugs.get(slug);
    if (!current || Date.parse(updatedAt) > Date.parse(current))
      gameSlugs.set(slug, updatedAt);
  };

  for (const review of reviewResult.data ?? []) {
    if (suspendedProfiles.has(review.profile_id)) continue;
    paths.push(
      ...entry(`/review/${review.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.6,
        lastModified: review.updated_at,
      }),
    );
    rememberProfile(review.profiles, review.updated_at);
    rememberGame(review.game_slug, review.updated_at);
  }

  const journeys = new Map<string, string>();
  for (const diaryEntry of entryResult.data ?? []) {
    if (suspendedProfiles.has(diaryEntry.profile_id)) continue;
    paths.push(
      ...entry(`/entry/${diaryEntry.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.5,
        lastModified: diaryEntry.updated_at,
      }),
    );
    rememberProfile(diaryEntry.profiles, diaryEntry.updated_at);
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
    if (suspendedProfiles.has(shot.profile_id)) continue;
    paths.push(
      ...entry(`/shot/${shot.public_id}`, {
        changeFrequency: "monthly",
        priority: 0.4,
        lastModified: shot.created_at,
      }),
    );
    rememberProfile(shot.profiles, shot.created_at);
    rememberGame(shot.game_slug, shot.created_at);
  }

  for (const list of listResult.data ?? []) {
    if (suspendedProfiles.has(list.profile_id)) continue;
    paths.push(
      ...entry(`/lists/${list.public_id}`, {
        changeFrequency: "weekly",
        priority: 0.5,
        lastModified: list.updated_at,
      }),
    );
    rememberProfile(list.profiles, list.updated_at);
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
  return [
    ...shell,
    ...games.flatMap((game) =>
      entry(`/game/${game.slug}`, {
        changeFrequency: "weekly",
        priority: 0.7,
        images: [game.coverUrl],
      }),
    ),
    ...community,
  ];
}
