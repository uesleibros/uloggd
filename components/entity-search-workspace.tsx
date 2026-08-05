import Link from "next/link";
import { Building2, CalendarDays, SearchX } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import {
  ConnectionCard,
  type ConnectionPerson,
} from "@/components/social/connection-card";
import { ListPreviewCard } from "@/components/social/list-preview-card";
import {
  ActivityStream,
  type SocialEntry,
} from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import type { CompanySearchResult } from "@/lib/igdb";
import type { ProfileLevel } from "@/lib/profile-level";
import type { ListPreview } from "@/lib/lists-types";
import { tri, type UiLang } from "@/lib/ui-text";
import { EntitySearchControls } from "./entity-search-controls";
import { EntitySearchForm } from "./entity-search-form";
import { SearchEntityPagination } from "./search-entity-pagination";
import { SearchScopeTabs, type SearchScope } from "./search-scope-tabs";

type FilterOption = { value: string; label: string };

/** Reviews are long; thirty on screen is already a lot of scrolling. */
const REVIEW_PAGE_SIZE = 20;

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
  levels,
  viewerId = null,
  page,
  total,
  totalPages,
  lists = [],
  people = [],
  companies = [],
  entries = [],
  entriesHaveMore = false,
}: {
  lang: UiLang;
  scope: Exclude<SearchScope, "games">;
  query: string;
  sort: string;
  role?: string;
  status?: string;
  verified?: boolean;
  /** Levels for this page of people, read in one call by the page. */
  levels?: Map<string, ProfileLevel>;
  viewerId?: string | null;
  page: number;
  total: number;
  totalPages: number;
  lists?: ListPreview[];
  people?: ConnectionPerson[];
  companies?: CompanySearchResult[];
  /** Reviews, which page by cursor rather than by numbered page. */
  entries?: SocialEntry[];
  entriesHaveMore?: boolean;
}) {
  const tierlists = scope === "tierlists";
  const reviews = scope === "reviews";
  const title = reviews
    ? tri(
        lang,
        "Leia o que a comunidade escreveu",
        "Read what the community wrote",
        "Lee lo que escribió la comunidad",
      )
    : scope === "people"
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
  const description = reviews
    ? tri(
        lang,
        "Todas as reviews públicas do site. Busque por jogo, plataforma ou pelo texto.",
        "Every public review on the site. Search by game, platform, or the text itself.",
        "Todas las reseñas públicas del sitio. Busca por juego, plataforma o por el texto.",
      )
    : scope === "people"
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
  // Recent and oldest only. Both walk the same `created_at` cursor the load
  // button uses; a "best rated" sort would order by something the cursor
  // cannot follow, and would silently stop paging after the first thirty.
  const sortOptions: FilterOption[] = reviews
    ? [
        {
          value: "recent",
          label: tri(lang, "Mais recentes", "Newest", "Más recientes"),
        },
        {
          value: "oldest",
          label: tri(lang, "Mais antigas", "Oldest", "Más antiguas"),
        },
      ]
    : scope === "companies"
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
  const hasResults =
    lists.length + people.length + companies.length + entries.length > 0;
  const currentFilters = {
    sort,
    ...(scope === "people" ? { verified: verified ? "1" : "" } : {}),
    ...(scope === "companies" ? { role, status } : {}),
  };
  const activeFilterCount =
    Number(verified) + Number(role !== "any") + Number(status !== "any");
  const scopeLabel = reviews
    ? tri(lang, "Reviews", "Reviews", "Reseñas")
    : scope === "people"
      ? tri(lang, "Pessoas", "People", "Personas")
      : scope === "companies"
        ? tri(lang, "Empresas", "Companies", "Empresas")
        : tierlists
          ? "Tier lists"
          : tri(lang, "Listas", "Lists", "Listas");
  const activeSort =
    sortOptions.find((option) => option.value === sort)?.label ??
    sortOptions[0].label;
  const pageHref = (nextPage: number) =>
    filterHref(lang, scope, query, "page", String(nextPage), currentFilters);
  return (
    <main className="catalog-search-page entity-search-page">
      <header className="catalog-search-hero">
        <div className="catalog-search-hero-copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <EntitySearchForm
          key={`${scope}:${query}`}
          lang={lang}
          scope={scope}
          query={query}
        />
        <div className="catalog-search-signals">
          <span>
            {tri(
              lang,
              "Filtros persistem na URL",
              "Filters persist in the URL",
              "Los filtros se guardan en la URL",
            )}
          </span>
          <span>
            {tri(
              lang,
              "24 resultados por página",
              "24 results per page",
              "24 resultados por página",
            )}
          </span>
        </div>
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

      <div className="catalog-search-workspace entity-search-workspace">
        <section className="entity-search-results catalog-results-panel">
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
          {reviews ? (
            /* Its own branch, because reviews are not cards in a grid: they
               are the whole text, drawn by the same component the home page
               and every profile use, so a review reads identically wherever
               it is met. */
            entries.length ? (
              <div className="entity-search-reviews">
                <ActivityStream
                  entries={entries}
                  lang={lang}
                  viewerId={viewerId}
                />
                <LoadMoreActivity
                  lang={lang}
                  viewerId={viewerId}
                  feed="community"
                  order={sort === "oldest" ? "oldest" : "recent"}
                  query={query || undefined}
                  pageSize={REVIEW_PAGE_SIZE}
                  initialCursor={entries[entries.length - 1].createdAt}
                  hasMore={entriesHaveMore}
                />
              </div>
            ) : (
              <div className="catalog-results-empty entity-results-empty">
                <SearchX size={25} />
                <h2>
                  {tri(
                    lang,
                    "Nenhuma review encontrada",
                    "No reviews found",
                    "Ninguna reseña encontrada",
                  )}
                </h2>
                <p>
                  {tri(
                    lang,
                    "Tente outro termo, ou limpe a busca para ver todas.",
                    "Try another term, or clear the search to see them all.",
                    "Prueba otro término, o limpia la búsqueda para verlas todas.",
                  )}
                </p>
              </div>
            )
          ) : hasResults ? (
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
                <ConnectionCard
                  key={person.id}
                  person={person}
                  lang={lang}
                  standing={levels?.get(person.id)}
                  viewerId={viewerId}
                />
              ))}
              {companies.map((company) => (
                <Link
                  className="entity-result-card"
                  href={`/${lang}/company/${company.slug}`}
                  key={company.id}
                >
                  <span className="entity-result-mark entity-result-company">
                    {company.logoUrl ? (
                      <SafeImage
                        src={company.logoUrl}
                        alt=""
                        fill
                        sizes="56px"
                      />
                    ) : (
                      <Building2 size={22} />
                    )}
                  </span>
                  <span className="entity-result-copy">
                    <strong>{company.name}</strong>
                    <small>
                      {company.foundedYear && (
                        <>
                          <CalendarDays size={11} /> {company.foundedYear}{" "}
                          ·{" "}
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
          {/* Reviews page by cursor with a button of their own, so the
              numbered pager would be a second, disagreeing control. */}
          {!reviews && (
            <SearchEntityPagination
              page={page}
              totalPages={totalPages}
              lang={lang}
            />
          )}
        </section>
        <aside
          className="catalog-context-rail entity-context-rail"
          aria-label={tri(
            lang,
            "Resumo da busca",
            "Search summary",
            "Resumen de la búsqueda",
          )}
        >
          <section className="catalog-context-total">
            <span>{tri(lang, "RESULTADOS", "RESULTS", "RESULTADOS")}</span>
            <strong>{total.toLocaleString(lang)}</strong>
            <small>
              {tri(
                lang,
                "itens correspondem à busca",
                "items match this search",
                "elementos coinciden con la búsqueda",
              )}
            </small>
          </section>
          <section className="catalog-context-card">
            <header>
              <strong>
                {tri(lang, "Sua busca", "Your search", "Tu búsqueda")}
              </strong>
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </header>
            <dl>
              <div>
                <dt>{tri(lang, "Escopo", "Scope", "Ámbito")}</dt>
                <dd>{scopeLabel}</dd>
              </div>
              <div>
                <dt>{tri(lang, "Ordenação", "Sorting", "Ordenación")}</dt>
                <dd>{activeSort}</dd>
              </div>
              {query && (
                <div>
                  <dt>{tri(lang, "Termo", "Query", "Consulta")}</dt>
                  <dd>{query}</dd>
                </div>
              )}
            </dl>
          </section>
          {totalPages > 1 && (
            <section className="catalog-context-card catalog-context-navigation">
              <div>
                <strong>
                  {tri(
                    lang,
                    `Página ${page}`,
                    `Page ${page}`,
                    `Página ${page}`,
                  )}
                </strong>
                <span>
                  {tri(
                    lang,
                    `de ${totalPages}`,
                    `of ${totalPages}`,
                    `de ${totalPages}`,
                  )}
                </span>
              </div>
              <div>
                {page > 1 ? (
                  <Link href={pageHref(page - 1)}>
                    {tri(lang, "Anterior", "Previous", "Anterior")}
                  </Link>
                ) : (
                  <span aria-disabled="true">
                    {tri(lang, "Anterior", "Previous", "Anterior")}
                  </span>
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)}>
                    {tri(lang, "Próxima", "Next", "Siguiente")}
                  </Link>
                ) : (
                  <span aria-disabled="true">
                    {tri(lang, "Próxima", "Next", "Siguiente")}
                  </span>
                )}
              </div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
