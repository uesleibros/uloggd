import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogSearchWorkspace } from "@/components/catalog-search-workspace";
import { readCatalogFilters } from "@/lib/catalog-filters";
import { EntitySearchClient } from "@/components/entity-search-client";
import { type SearchScope } from "@/components/search-scope-tabs";
import {
  getCatalogSearchOptions,
  getCatalogPublisherOptions,
} from "@/lib/igdb";
import { getAuthUser } from "@/lib/supabase/auth";
import { socialMetadata } from "@/lib/seo";
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
  if (scope !== "games") {
    // Reviews, people, lists and companies are searched from the browser,
    // like the catalogue: the page draws the frame and knows who is looking,
    // and nothing else.
    const viewer = await getAuthUser();
    return (
      <EntitySearchClient
        // One instance per scope. The results keep their last answer while
        // the next loads, and an answer from another scope is the wrong shape:
        // lists drawn as people would break the card, not merely look stale.
        key={scope}
        lang={lang}
        scope={scope}
        viewerId={viewer?.id ?? null}
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
