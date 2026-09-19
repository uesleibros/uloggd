import { serverApi } from "@/lib/api-server";
import type {
  ReviewSearch,
  PeopleSearch,
  ListSearch,
} from "@/lib/search-types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSearchWorkspace } from "@/components/catalog-search-workspace";
import { readCatalogFilters } from "@/lib/catalog-filters";
import { EntitySearchWorkspace } from "@/components/entity-search-workspace";
import { type SearchScope } from "@/components/search-scope-tabs";
import {
  getCatalogSearchOptions,
  getCatalogPublisherOptions,
  searchCompanies,
} from "@/lib/igdb";
import { getAuthUser } from "@/lib/supabase/auth";
import { socialMetadata } from "@/lib/seo";
import { tri } from "@/lib/ui-text";
import { hasLocale } from "../dictionaries";
import "./catalog.css";

/** Reviews are long, so a page of them is shorter than a page of cards. */
const REVIEWS_PER_PAGE = 20;

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
    requestedScope === "reviews" ||
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
    if (scope === "reviews") {
      // Numbered pages, like every other scope here. The first version paged
      // by cursor with a load button, which meant only the two sorts that walk
      // `created_at` could work; ordering by rating would have stopped paging
      // after the first page without saying so.
      const reviewSort =
        first(query.sort) === "oldest"
          ? "oldest"
          : first(query.sort) === "rating"
            ? "rating"
            : "recent";
      const [{ data: entries, total }, viewer] = await Promise.all([
        serverApi.get<ReviewSearch>(
          `/search/reviews?${new URLSearchParams({ q: entityQuery, sort: reviewSort, page: String(entityPage) })}`,
        ),
        getAuthUser(),
      ]);
      return (
        <EntitySearchWorkspace
          lang={lang}
          scope="reviews"
          query={entityQuery}
          sort={reviewSort}
          page={entityPage}
          total={total}
          totalPages={Math.ceil(total / REVIEWS_PER_PAGE)}
          entries={entries}
          viewerId={viewer?.id ?? null}
        />
      );
    }
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

    if (scope === "people") {
      const verified = first(query.verified) === "1";
      const personSort =
        first(query.sort) === "name" || first(query.sort) === "newest"
          ? (first(query.sort) as "name" | "newest")
          : "relevance";
      const [result, viewer] = await Promise.all([
        serverApi.get<PeopleSearch>(
          `/search/people?${new URLSearchParams({ q: entityQuery, sort: personSort, page: String(entityPage), verified: verified ? "1" : "0" })}`,
        ),
        getAuthUser(),
      ]);
      const people = result.data,
        total = result.total;
      const levels = new Map(
        result.levels.map((level) => [level.profile_id, level]),
      );
      const shared = new Map(
        result.shared.map((row) => [row.profile_id, Number(row.shared_games)]),
      );
      return (
        <EntitySearchWorkspace
          lang={lang}
          scope="people"
          sharedGames={shared}
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
    const { data: lists, total } = await serverApi.get<ListSearch>(
      `/search/lists?${new URLSearchParams({ q: entityQuery, sort: listSort, page: String(entityPage), kind: scope === "tierlists" ? "TIERLIST" : "COLLECTION" })}`,
    );
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
  const requestedCreate = first(query.create);
  const createMode =
    requestedCreate === "review" || requestedCreate === "screenshot"
      ? requestedCreate
      : null;
  // Read here only for the publishers a shared link may name that are not in
  // the base list, so their chips have a name. The search itself runs in the
  // browser: this page used to run it, and nothing was on screen until IGDB had
  // answered.
  const filters = readCatalogFilters(
    new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) =>
        value === undefined ? [] : [[key, first(value) ?? ""]],
      ),
    ),
  );
  const [baseOptions, selectedPublishers, user] = await Promise.all([
    getCatalogSearchOptions(),
    getCatalogPublisherOptions(filters.publishers),
    getAuthUser(),
  ]);
  const publisherOptions = new Map(
    [...baseOptions.publishers, ...selectedPublishers].map((option) => [
      option.id,
      option,
    ]),
  );
  const knownEngines = new Set(
    baseOptions.engines.map((option) => option.name.toLocaleLowerCase()),
  );
  const options = {
    ...baseOptions,
    engines: [
      ...baseOptions.engines,
      ...filters.engines.flatMap((name, index) =>
        knownEngines.has(name.toLocaleLowerCase())
          ? []
          : [{ id: -(index + 1), name }],
      ),
    ],
    publishers: [...publisherOptions.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };

  return (
    <CatalogSearchWorkspace
      lang={lang}
      options={options}
      enabled={Boolean(user)}
      createMode={createMode}
      showScopeTabs={!createMode}
    />
  );
}
