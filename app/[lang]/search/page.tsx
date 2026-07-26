import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSearchWorkspace } from "@/components/catalog-search-workspace";
import {
  EntitySearchWorkspace,
  type EntityListResult,
  type PersonSearchResult,
} from "@/components/entity-search-workspace";
import {
  SearchScopeTabs,
  type SearchScope,
} from "@/components/search-scope-tabs";
import {
  getCatalogSearchOptions,
  getCatalogPublisherOptions,
  searchCatalogGames,
  searchCompanies,
  type CatalogSearchFilters,
} from "@/lib/igdb";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getSpawndGame } from "@/lib/spawnd";
import { localeAlternates } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../dictionaries";
import "./catalog.css";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) return {};
  const filtered = Object.values(query).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
  const description = tri(
    lang,
    "Encontre jogos, listas, tier lists, pessoas e empresas no uloggd.",
    "Find games, lists, tier lists, people, and companies on uloggd.",
    "Encuentra juegos, listas, tier lists, personas y empresas en uloggd.",
  );
  return {
    title: tri(lang, "Buscar no uloggd", "Search uloggd", "Buscar en uloggd"),
    description,
    alternates: localeAlternates(lang, "/search"),
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

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
  const requestedScope = first(query.scope);
  const scope: SearchScope =
    requestedScope === "lists" ||
    requestedScope === "tierlists" ||
    requestedScope === "people" ||
    requestedScope === "companies"
      ? requestedScope
      : "games";
  const entityQuery = (first(query.q) ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const entityPage = boundedNumber(query.page, 1, 100) ?? 1;
  if (scope !== "games") {
    if (scope === "companies") {
      const role =
        first(query.role) === "publisher" || first(query.role) === "developer"
          ? (first(query.role) as "publisher" | "developer")
          : "any";
      const status = first(query.status) === "active" ? "active" : "any";
      const companySorts = new Set([
        "relevance",
        "catalog",
        "name",
        "oldest",
        "newest",
      ]);
      const companySort = companySorts.has(first(query.sort) ?? "")
        ? (first(query.sort) as
            "relevance" | "catalog" | "name" | "oldest" | "newest")
        : "relevance";
      const result = await searchCompanies({
        query: entityQuery,
        role,
        status,
        sort: companySort,
        page: entityPage,
      });
      return (
        <EntitySearchWorkspace
          lang={lang}
          scope="companies"
          query={entityQuery}
          sort={companySort}
          role={role}
          status={status}
          page={Math.min(entityPage, Math.max(1, result.totalPages))}
          total={result.total}
          totalPages={result.totalPages}
          companies={result.companies}
        />
      );
    }

    const supabase = await getSupabase();
    const safeQuery = entityQuery.replace(/[%_,()]/g, "");
    if (scope === "people") {
      const verified = first(query.verified) === "1";
      const personSort =
        first(query.sort) === "name" || first(query.sort) === "newest"
          ? (first(query.sort) as "name" | "newest")
          : "relevance";
      let request = supabase
        .from("profiles")
        .select("username,display_name,avatar_url,bio,verified", {
          count: "exact",
        })
        .not("username", "is", null);
      if (safeQuery.length >= 2)
        request = request.or(
          `username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`,
        );
      if (verified) request = request.eq("verified", true);
      if (personSort === "name")
        request = request.order("username", { ascending: true });
      else if (personSort === "newest")
        request = request.order("created_at", { ascending: false });
      else
        request = request
          .order("verified", { ascending: false })
          .order("created_at", { ascending: false });
      const { data, count } = await request.range(
        (entityPage - 1) * 24,
        entityPage * 24 - 1,
      );
      const people: PersonSearchResult[] = (data ?? []).map((person) => ({
        username: String(person.username),
        displayName: person.display_name,
        avatarUrl: person.avatar_url,
        bio: person.bio,
        verified: Boolean(person.verified),
      }));
      const total = count ?? 0;
      return (
        <EntitySearchWorkspace
          lang={lang}
          scope="people"
          query={entityQuery}
          sort={personSort}
          verified={verified}
          page={entityPage}
          total={total}
          totalPages={Math.ceil(total / 24)}
          people={people}
        />
      );
    }

    const listSort =
      first(query.sort) === "name" || first(query.sort) === "oldest"
        ? (first(query.sort) as "name" | "oldest")
        : "recent";
    let request = supabase
      .from("game_lists")
      .select(
        "public_id,name,description,kind,ranked,updated_at,owner:profiles!game_lists_profile_id_fkey(username),game_list_items(count)",
        { count: "exact" },
      )
      .eq("visibility", "PUBLIC");
    request =
      scope === "tierlists"
        ? request.eq("kind", "TIERLIST")
        : request.or("kind.is.null,kind.eq.COLLECTION");
    if (safeQuery.length >= 2)
      request = request.ilike("name", `%${safeQuery}%`);
    if (listSort === "name")
      request = request.order("name", { ascending: true });
    else if (listSort === "oldest")
      request = request.order("updated_at", { ascending: true });
    else request = request.order("updated_at", { ascending: false });
    const { data, count } = await request.range(
      (entityPage - 1) * 24,
      entityPage * 24 - 1,
    );
    const lists: EntityListResult[] = (data ?? []).map((list) => {
      const owner = Array.isArray(list.owner) ? list.owner[0] : list.owner;
      const itemCount = Array.isArray(list.game_list_items)
        ? Number(list.game_list_items[0]?.count ?? 0)
        : 0;
      return {
        publicId: list.public_id,
        name: list.name,
        description: list.description,
        owner: owner?.username ?? null,
        itemCount,
        updatedAt: list.updated_at,
      };
    });
    const total = count ?? 0;
    return (
      <EntitySearchWorkspace
        lang={lang}
        scope={scope}
        query={entityQuery}
        sort={listSort}
        page={entityPage}
        total={total}
        totalPages={Math.ceil(total / 24)}
        lists={lists}
      />
    );
  }
  const sort = first(query.sort);
  const requestedCreate = first(query.create);
  const createMode =
    requestedCreate === "review" || requestedCreate === "screenshot"
      ? requestedCreate
      : null;
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
    publisherRole:
      first(query.role) === "publisher" || first(query.role) === "developer"
        ? (first(query.role) as "publisher" | "developer")
        : "any",
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
  const [baseOptions, selectedPublishers, result, supabase] = await Promise.all(
    [
      getCatalogSearchOptions(),
      getCatalogPublisherOptions(filters.publishers),
      searchCatalogGames(filters),
      process.env.ULOGGD_E2E === "1" ? null : getSupabase(),
    ],
  );
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
        createMode={createMode}
        scopeTabs={
          createMode ? undefined : (
            <SearchScopeTabs lang={lang} active="games" query={filters.query} />
          )
        }
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
      createMode={createMode}
      scopeTabs={
        createMode ? undefined : (
          <SearchScopeTabs lang={lang} active="games" query={filters.query} />
        )
      }
    />
  );
}
