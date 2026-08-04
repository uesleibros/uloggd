import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSearchWorkspace } from "@/components/catalog-search-workspace";
import { EntitySearchWorkspace } from "@/components/entity-search-workspace";
import type { ConnectionPerson } from "@/components/social/connection-card";
import {
  SearchScopeTabs,
  type SearchScope,
} from "@/components/search-scope-tabs";
import {
  getCatalogSearchOptions,
  getCatalogPublisherOptions,
  getGamesByIds,
  searchCatalogGames,
  searchCompanies,
  type CatalogSearchFilters,
} from "@/lib/igdb";
import { resolveGameCover } from "@/lib/game-cover";
import { getCommunityGameRatings } from "@/lib/community-ratings";
import type { ListPreview } from "@/lib/lists-types";
import { getAuthUser, getSupabase } from "@/lib/supabase/auth";
import { getSpawndGame } from "@/lib/spawnd";
import { getTierlistPreview } from "@/lib/tierlists";
import { socialMetadata } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../dictionaries";
import "./catalog.css";
import { getProfileLevels } from "@/lib/profile-level";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) return {};
  const scope = first(query.scope);
  const filtered = Object.values(query).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
  const description = tri(
    lang,
    "Encontre jogos, listas, tier lists, pessoas e empresas no uloggd.",
    "Find games, lists, tier lists, people, and companies on uloggd.",
    "Encuentra juegos, listas, tier lists, personas y empresas en uloggd.",
  );
  const title =
    scope === "lists"
      ? tri(lang, "Buscar listas", "Search lists", "Buscar listas")
      : scope === "tierlists"
        ? tri(
            lang,
            "Buscar tier lists",
            "Search tier lists",
            "Buscar tier lists",
          )
        : scope === "people"
          ? tri(lang, "Buscar pessoas", "Search people", "Buscar personas")
          : scope === "companies"
            ? tri(
                lang,
                "Buscar empresas",
                "Search companies",
                "Buscar empresas",
              )
            : tri(lang, "Buscar jogos", "Search games", "Buscar juegos");
  return {
    title,
    description,
    ...socialMetadata({ lang, path: "/search", title, description }),
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

function nameList(value: string | string[] | undefined) {
  return [
    ...new Set(
      (first(value) ?? "")
        .split(",")
        .map((item) => item.normalize("NFKC").trim())
        .filter((item) => item.length > 0 && item.length <= 80),
    ),
  ].slice(0, 24);
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
        .select(
          "id,username,display_name,avatar_url,bio,verified,account_type",
          {
            count: "exact",
          },
        )
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
      const people: ConnectionPerson[] = (data ?? []).map((person) => ({
        id: person.id,
        username: String(person.username),
        display_name: person.display_name,
        avatar_url: person.avatar_url,
        bio: person.bio,
        verified: Boolean(person.verified),
        account_type: person.account_type,
      }));
      const total = count ?? 0;
      // One call for the whole page of results, same as the connections page.
      // The viewer is read here rather than reused from below, since that one
      // is fetched further down the file for a different branch.
      const [levels, viewer] = await Promise.all([
        getProfileLevels(
          supabase,
          people.map((person) => person.id),
        ),
        getAuthUser(),
      ]);
      return (
        <EntitySearchWorkspace
          lang={lang}
          scope="people"
          levels={levels}
          query={entityQuery}
          sort={personSort}
          verified={verified}
          page={entityPage}
          total={total}
          totalPages={Math.ceil(total / 24)}
          people={people}
          viewerId={viewer?.id ?? null}
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
        "id,public_id,name,description,kind,ranked,updated_at,game_list_items(count)",
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
    const rows = data ?? [];
    const listIds = rows.map((list) => list.id);
    const compactItems = listIds.length
      ? await supabase.rpc("get_list_preview_items", {
          target_lists: listIds,
          items_per_list: 5,
        })
      : { data: [], error: null };
    const fallbackItems = compactItems.error
      ? await supabase
          .from("game_list_items")
          .select("list_id,igdb_id,position")
          .in("list_id", listIds)
          .order("position", { ascending: true })
      : null;
    const previewItems = (
      compactItems.error
        ? (fallbackItems?.data ?? [])
        : (compactItems.data ?? [])
    ) as {
      list_id: string;
      igdb_id: number;
      item_count?: number;
    }[];
    const itemsByList = new Map<string, typeof previewItems>();
    previewItems.forEach((item) => {
      const items = itemsByList.get(item.list_id) ?? [];
      items.push(item);
      itemsByList.set(item.list_id, items);
    });
    const coverIds = [...new Set(previewItems.map((item) => item.igdb_id))];
    const [coverGames, likesResult] = await Promise.all([
      getGamesByIds(coverIds),
      listIds.length
        ? supabase.rpc("get_content_likes", {
            target_type: "list",
            target_ids: listIds,
          })
        : Promise.resolve({ data: [] }),
    ]);
    const gamesById = new Map(coverGames.map((game) => [game.id, game]));
    const likesById = new Map(
      (
        (likesResult.data ?? []) as {
          content_id: string;
          like_count: number;
        }[]
      ).map((item) => [item.content_id, Number(item.like_count)]),
    );
    const lists: ListPreview[] = await Promise.all(
      rows.map(async (list) => {
        const items = itemsByList.get(list.id) ?? [];
        const tier =
          list.kind === "TIERLIST"
            ? await getTierlistPreview(supabase, list.id)
            : null;
        return {
          id: list.id,
          publicId: list.public_id,
          name: list.name,
          description: list.description,
          visibility: "PUBLIC" as const,
          ranked: Boolean(list.ranked),
          kind:
            list.kind === "TIERLIST"
              ? ("TIERLIST" as const)
              : ("COLLECTION" as const),
          count: tier?.count ?? Number(items[0]?.item_count ?? items.length),
          covers: tier
            ? []
            : items.flatMap((item) => {
                const game = gamesById.get(item.igdb_id);
                return game
                  ? [
                      {
                        url: resolveGameCover(game.coverUrl),
                        fallbackUrl: game.coverUrl,
                        name: game.name,
                      },
                    ]
                  : [];
              }),
          tierRows: tier?.rows,
          likes: likesById.get(list.id) ?? 0,
          updatedAt: list.updated_at,
        };
      }),
    );
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
    engines: nameList(query.engines),
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
  const selectedEngineNames = new Set(
    baseOptions.engines.map((option) => option.name.toLocaleLowerCase()),
  );
  const options = {
    ...baseOptions,
    engines: [
      ...baseOptions.engines,
      ...filters.engines.flatMap((name, index) =>
        selectedEngineNames.has(name.toLocaleLowerCase())
          ? []
          : [{ id: -(index + 1), name }],
      ),
    ],
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
        communityRatings={{}}
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
  const [user, communityRatingMap] = await Promise.all([
    getAuthUser(),
    getCommunityGameRatings(
      supabase,
      result.games.map((game) => game.id),
    ),
  ]);
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
  const communityRatings = Object.fromEntries(communityRatingMap);

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
      communityRatings={communityRatings}
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
