import Link from "next/link";
import { Building2, CalendarDays, SearchX } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import {
  ConnectionCard,
  type ConnectionPerson,
} from "@/components/social/connection-card";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import type { CompanySearchResult } from "@/lib/igdb";
import type { ListPreview } from "@/lib/lists-types";
import { tri, type UiLang } from "@/lib/ui-text";
import { EntitySearchControls } from "./entity-search-controls";
import { EntitySearchForm } from "./entity-search-form";
import { SearchEntityPagination } from "./search-entity-pagination";
import { SearchScopeTabs, type SearchScope } from "./search-scope-tabs";

type FilterOption = { value: string; label: string };

function filterHref(
  lang: UiLang,
  scope: SearchScope,
  query: string,
  key: string,
  value: string,
  current: Record<string, string>,
) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (query) params.set("q", query);
  Object.entries(current).forEach(([name, selected]) => {
    if (selected && selected !== "any" && selected !== "relevance")
      params.set(name, selected);
  });
  if (!value || value === "any" || value === "relevance") params.delete(key);
  else params.set(key, value);
  return `/${lang}/search?${params}`;
}

export function EntitySearchWorkspace({
  lang,
  scope,
  query,
  sort,
  role = "any",
  status = "any",
  verified = false,
  page,
  total,
  totalPages,
  lists = [],
  people = [],
  companies = [],
}: {
  lang: UiLang;
  scope: Exclude<SearchScope, "games">;
  query: string;
  sort: string;
  role?: string;
  status?: string;
  verified?: boolean;
  page: number;
  total: number;
  totalPages: number;
  lists?: ListPreview[];
  people?: ConnectionPerson[];
  companies?: CompanySearchResult[];
}) {
  const tierlists = scope === "tierlists";
  const title =
    scope === "people"
      ? tri(
          lang,
          "Encontre pessoas para acompanhar",
          "Find people to follow",
          "Encuentra personas para seguir",
        )
      : scope === "companies"
        ? tri(
            lang,
            "Encontre empresas de jogos",
            "Find game companies",
            "Encuentra empresas de videojuegos",
          )
        : tierlists
          ? tri(
              lang,
              "Encontre tier lists da comunidade",
              "Find community tier lists",
              "Encuentra tier lists de la comunidad",
            )
          : tri(
              lang,
              "Encontre listas da comunidade",
              "Find community lists",
              "Encuentra listas de la comunidad",
            );
  const description =
    scope === "people"
      ? tri(
          lang,
          "Busque por nome público ou @usuário e refine por contas verificadas.",
          "Search by display name or @username and refine by verified accounts.",
          "Busca por nombre público o @usuario y filtra por cuentas verificadas.",
        )
      : scope === "companies"
        ? tri(
            lang,
            "Busque estúdios e publicadoras, filtre pelo papel e explore seus catálogos.",
            "Search studios and publishers, filter by role, and explore their catalogs.",
            "Busca estudios y editoras, filtra por función y explora sus catálogos.",
          )
        : tierlists
          ? tri(
              lang,
              "Rankings visuais da comunidade, ordenados por atualização ou nome.",
              "Visual community rankings, ordered by update date or name.",
              "Rankings visuales de la comunidad, ordenados por actualización o nombre.",
            )
          : tri(
              lang,
              "Coleções públicas de jogos criadas pela comunidade.",
              "Public game collections created by the community.",
              "Colecciones públicas de juegos creadas por la comunidad.",
            );
  const sortOptions: FilterOption[] =
    scope === "companies"
      ? [
          {
            value: "relevance",
            label: tri(lang, "Relevância", "Relevance", "Relevancia"),
          },
          {
            value: "catalog",
            label: tri(
              lang,
              "Maior catálogo",
              "Largest catalog",
              "Mayor catálogo",
            ),
          },
          { value: "name", label: tri(lang, "Nome", "Name", "Nombre") },
          {
            value: "oldest",
            label: tri(lang, "Mais antigas", "Oldest", "Más antiguas"),
          },
          {
            value: "newest",
            label: tri(lang, "Mais novas", "Newest", "Más nuevas"),
          },
        ]
      : scope === "people"
        ? [
            {
              value: "relevance",
              label: tri(lang, "Relevância", "Relevance", "Relevancia"),
            },
            { value: "name", label: tri(lang, "Nome", "Name", "Nombre") },
            {
              value: "newest",
              label: tri(lang, "Mais recentes", "Newest", "Más recientes"),
            },
          ]
        : [
            {
              value: "recent",
              label: tri(
                lang,
                "Atualizadas",
                "Recently updated",
                "Actualizadas",
              ),
            },
            { value: "name", label: tri(lang, "Nome", "Name", "Nombre") },
            {
              value: "oldest",
              label: tri(lang, "Mais antigas", "Oldest", "Más antiguas"),
            },
          ];
  const hasResults = lists.length + people.length + companies.length > 0;
  const currentFilters = {
    sort,
    ...(scope === "people" ? { verified: verified ? "1" : "" } : {}),
    ...(scope === "companies" ? { role, status } : {}),
  };
  return (
    <main className="catalog-search-page entity-search-page">
      <header className="catalog-search-hero">
        <h1>{title}</h1>
        <p>{description}</p>
        <EntitySearchForm lang={lang} scope={scope} query={query} />
      </header>

      <SearchScopeTabs lang={lang} active={scope} query={query} />

      {(verified || role !== "any" || status !== "any") && (
        <div className="catalog-active-filters">
          {verified && (
            <Link
              className="entity-active-filter"
              href={filterHref(
                lang,
                scope,
                query,
                "verified",
                "any",
                currentFilters,
              )}
            >
              {tri(lang, "Verificadas", "Verified", "Verificadas")}{" "}
              <span aria-hidden>×</span>
            </Link>
          )}
          {role !== "any" && (
            <Link
              className="entity-active-filter"
              href={filterHref(
                lang,
                scope,
                query,
                "role",
                "any",
                currentFilters,
              )}
            >
              {role === "publisher"
                ? tri(lang, "Publicadoras", "Publishers", "Editoras")
                : tri(
                    lang,
                    "Desenvolvedoras",
                    "Developers",
                    "Desarrolladoras",
                  )}{" "}
              <span aria-hidden>×</span>
            </Link>
          )}
          {status !== "any" && (
            <Link
              className="entity-active-filter"
              href={filterHref(
                lang,
                scope,
                query,
                "status",
                "any",
                currentFilters,
              )}
            >
              {tri(lang, "Ativas", "Active", "Activas")}{" "}
              <span aria-hidden>×</span>
            </Link>
          )}
          <Link
            href={`/${lang}/search?scope=${scope}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
          >
            {tri(lang, "Limpar tudo", "Clear all", "Limpiar todo")}
          </Link>
        </div>
      )}

      <section className="entity-search-results">
        <header className="catalog-results-heading">
          <div className="catalog-results-heading-copy">
            <span>{tri(lang, "RESULTADOS", "RESULTS", "RESULTADOS")}</span>
            <h2>
              {total.toLocaleString(lang)}{" "}
              {tri(lang, "encontrados", "found", "encontrados")}
            </h2>
          </div>
          <EntitySearchControls
            lang={lang}
            scope={scope}
            sort={sort}
            sortOptions={sortOptions}
            role={role}
            status={status}
            verified={verified}
          />
        </header>
        {hasResults ? (
          <div
            className={
              lists.length
                ? "lists-row"
                : people.length
                  ? "profile-connections-grid"
                  : "entity-search-grid"
            }
          >
            {lists.map((list) => (
              <ListPreviewCard
                key={list.id}
                list={list}
                covers={list.covers}
                tierRows={list.tierRows}
                likes={list.likes}
                lang={lang}
              />
            ))}
            {people.map((person) => (
              <ConnectionCard key={person.id} person={person} lang={lang} />
            ))}
            {companies.map((company) => (
              <Link
                className="entity-result-card"
                href={`/${lang}/publisher/${company.slug}`}
                key={company.id}
              >
                <span className="entity-result-mark entity-result-company">
                  {company.logoUrl ? (
                    <SafeImage src={company.logoUrl} alt="" fill sizes="56px" />
                  ) : (
                    <Building2 size={22} />
                  )}
                </span>
                <span className="entity-result-copy">
                  <strong>{company.name}</strong>
                  <small>
                    {company.foundedYear && (
                      <>
                        <CalendarDays size={11} /> {company.foundedYear} ·{" "}
                      </>
                    )}
                    {company.publishedCount + company.developedCount}{" "}
                    {tri(lang, "jogos", "games", "juegos")}
                  </small>
                  <p>
                    {tri(
                      lang,
                      `${company.publishedCount} publicados · ${company.developedCount} desenvolvidos`,
                      `${company.publishedCount} published · ${company.developedCount} developed`,
                      `${company.publishedCount} publicados · ${company.developedCount} desarrollados`,
                    )}
                  </p>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="catalog-results-empty entity-results-empty">
            <SearchX size={25} />
            <h2>
              {tri(
                lang,
                "Nada encontrado",
                "Nothing found",
                "No encontramos resultados",
              )}
            </h2>
            <p>
              {tri(
                lang,
                "Tente um termo mais curto ou remova um filtro.",
                "Try a shorter term or remove a filter.",
                "Prueba un término más corto o elimina un filtro.",
              )}
            </p>
          </div>
        )}
        <SearchEntityPagination
          page={page}
          totalPages={totalPages}
          lang={lang}
        />
      </section>
    </main>
  );
}
