import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSearchWorkspace } from "@/components/catalog-search-workspace";
import {
  getCatalogSearchOptions,
  getCatalogPublisherOptions,
  searchCatalogGames,
  type CatalogSearchFilters,
} from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getSpawndGame } from "@/lib/spawnd";
import { hasLocale } from "../dictionaries";
import "./catalog.css";

export const metadata: Metadata = { title: "Buscar jogos" };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberList(value: string | string[] | undefined) {
  return (first(value) ?? "")
    .split(",")
    .map(Number)
    .filter((item) => Number.isSafeInteger(item) && item > 0)
    .slice(0, 24);
}

function boundedNumber(
  value: string | string[] | undefined,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(first(value));
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const sort = first(query.sort);
  const allowedSorts = new Set<CatalogSearchFilters["sort"]>([
    "popular",
    "rating",
    "newest",
    "oldest",
    "hype",
    "name",
  ]);
  const filters: CatalogSearchFilters = {
    query: (first(query.q) ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
    genres: numberList(query.genres),
    platforms: numberList(query.platforms),
    themes: numberList(query.themes),
    modes: numberList(query.modes),
    types: numberList(query.types),
    perspectives: numberList(query.perspectives),
    publishers: numberList(query.publishers),
    releaseStatus:
      first(query.release) === "released" || first(query.release) === "upcoming"
        ? (first(query.release) as "released" | "upcoming")
        : "all",
    ratedOnly: first(query.rated) === "1",
    anticipatedOnly: first(query.anticipated) === "1",
    yearFrom: boundedNumber(query.yearFrom, 1950, 2100),
    yearTo: boundedNumber(query.yearTo, 1950, 2100),
    ratingMin: boundedNumber(query.rating, 0, 100),
    ratingCountMin: boundedNumber(query.votes, 0, 10_000_000),
    sort: allowedSorts.has(sort as CatalogSearchFilters["sort"])
      ? (sort as CatalogSearchFilters["sort"])
      : "popular",
    page: boundedNumber(query.page, 1, 100) ?? 1,
  };
  const [baseOptions, selectedPublishers, result, supabase] = await Promise.all([
    getCatalogSearchOptions(),
    getCatalogPublisherOptions(filters.publishers),
    searchCatalogGames(filters),
    process.env.ULOGGD_E2E === "1" ? null : getSupabase(),
  ]);
  const publisherOptions = new Map(
    [...baseOptions.publishers, ...selectedPublishers].map((option) => [
      option.id,
      option,
    ]),
  );
  const options = {
    ...baseOptions,
    publishers: [...publisherOptions.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
  if (!supabase) {
    return (
      <CatalogSearchWorkspace
        key={JSON.stringify(filters)}
        lang={lang}
        filters={filters}
        options={options}
        games={result.games}
        total={result.total}
        totalPages={result.totalPages}
        saved={{}}
        enabled={false}
      />
    );
  }
  const user = await getAuthUser();
  const { data: savedGames } =
    user && result.games.length
      ? await supabase
          .from("user_games")
          .select(
            "igdb_id,status,playing,backlog,wishlist,liked,quick_rating,custom_cover_url",
          )
          .eq("profile_id", user.id)
          .in(
            "igdb_id",
            result.games.map((game) => game.id),
          )
      : { data: [] };
  const saved = Object.fromEntries(
    (savedGames ?? []).map((game) => [game.igdb_id, game]),
  );
  const games = result.games.map((game) => ({
    ...game,
    spawndAvailable: getSpawndGame({ igdbId: game.id, lang }).available,
  }));

  return (
    <CatalogSearchWorkspace
      key={JSON.stringify(filters)}
      lang={lang}
      filters={filters}
      options={options}
      games={games}
      total={result.total}
      totalPages={result.totalPages}
      saved={saved}
      enabled={Boolean(user)}
    />
  );
}
