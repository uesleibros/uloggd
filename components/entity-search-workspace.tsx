import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Layers3,
  Search,
  SearchX,
  Users,
} from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { VerifiedMark } from "@/components/verified-badge";
import type { CompanySearchResult } from "@/lib/igdb";
import { tri, type UiLang } from "@/lib/ui-text";
import { SearchEntityPagination } from "./search-entity-pagination";
import { SearchScopeTabs, type SearchScope } from "./search-scope-tabs";

export type EntityListResult = {
  publicId: string;
  name: string;
  description: string | null;
  owner: string | null;
  itemCount: number;
  updatedAt: string;
};

export type PersonSearchResult = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  verified: boolean;
};

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
  lists?: EntityListResult[];
  people?: PersonSearchResult[];
  companies?: CompanySearchResult[];
}) {
  const tierlists = scope === "tierlists";
  const title =
    scope === "people"
      ? tri(
          lang,
          "Encontre pessoas para seguir",
          "Find people to follow",
          "Encuentra personas a quienes seguir",
        )
      : scope === "companies"
        ? tri(
            lang,
            "Explore empresas de jogos",
            "Explore game companies",
            "Explora empresas de videojuegos",
          )
        : tierlists
          ? tri(
              lang,
              "Descubra tier lists",
              "Discover tier lists",
              "Descubre tier lists",
            )
          : tri(
              lang,
              "Descubra listas da comunidade",
              "Discover community lists",
              "Descubre listas de la comunidad",
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
        <form className="catalog-search-main-form" action={`/${lang}/search`}>
          <input type="hidden" name="scope" value={scope} />
          <label className="catalog-search-main-field">
            <Search size={20} />
            <input
              name="q"
              defaultValue={query}
              placeholder={
                scope === "people"
                  ? tri(
                      lang,
                      "Nome ou @usuário…",
                      "Name or @username…",
                      "Nombre o @usuario…",
                    )
                  : scope === "companies"
                    ? tri(
                        lang,
                        "Nome da empresa…",
                        "Company name…",
                        "Nombre de la empresa…",
                      )
                    : tri(
                        lang,
                        "Nome da lista…",
                        "List name…",
                        "Nombre de la lista…",
                      )
              }
            />
          </label>
          <button type="submit">
            {tri(lang, "Buscar", "Search", "Buscar")}
          </button>
        </form>
      </header>

      <SearchScopeTabs lang={lang} active={scope} query={query} />

      <section
        className="entity-search-filters"
        aria-label={tri(lang, "Filtros", "Filters", "Filtros")}
      >
        <div>
          <strong>{tri(lang, "Ordenar", "Sort", "Ordenar")}</strong>
          <span>
            {sortOptions.map((option) => (
              <Link
                key={option.value}
                href={filterHref(
                  lang,
                  scope,
                  query,
                  "sort",
                  option.value,
                  currentFilters,
                )}
                aria-current={sort === option.value ? "true" : undefined}
              >
                {option.label}
              </Link>
            ))}
          </span>
        </div>
        {scope === "people" && (
          <div>
            <strong>{tri(lang, "Conta", "Account", "Cuenta")}</strong>
            <span>
              <Link
                href={filterHref(
                  lang,
                  scope,
                  query,
                  "verified",
                  "any",
                  currentFilters,
                )}
                aria-current={!verified ? "true" : undefined}
              >
                {tri(lang, "Todas", "All", "Todas")}
              </Link>
              <Link
                href={filterHref(
                  lang,
                  scope,
                  query,
                  "verified",
                  "1",
                  currentFilters,
                )}
                aria-current={verified ? "true" : undefined}
              >
                {tri(lang, "Verificadas", "Verified", "Verificadas")}
              </Link>
            </span>
          </div>
        )}
        {scope === "companies" && (
          <>
            <div>
              <strong>{tri(lang, "Papel", "Role", "Función")}</strong>
              <span>
                {[
                  ["any", tri(lang, "Todos", "All", "Todos")],
                  [
                    "publisher",
                    tri(lang, "Publicadoras", "Publishers", "Editoras"),
                  ],
                  [
                    "developer",
                    tri(
                      lang,
                      "Desenvolvedoras",
                      "Developers",
                      "Desarrolladoras",
                    ),
                  ],
                ].map(([value, label]) => (
                  <Link
                    key={value}
                    href={filterHref(
                      lang,
                      scope,
                      query,
                      "role",
                      value,
                      currentFilters,
                    )}
                    aria-current={role === value ? "true" : undefined}
                  >
                    {label}
                  </Link>
                ))}
              </span>
            </div>
            <div>
              <strong>Status</strong>
              <span>
                <Link
                  href={filterHref(
                    lang,
                    scope,
                    query,
                    "status",
                    "any",
                    currentFilters,
                  )}
                  aria-current={status === "any" ? "true" : undefined}
                >
                  {tri(lang, "Todas", "All", "Todas")}
                </Link>
                <Link
                  href={filterHref(
                    lang,
                    scope,
                    query,
                    "status",
                    "active",
                    currentFilters,
                  )}
                  aria-current={status === "active" ? "true" : undefined}
                >
                  {tri(lang, "Ativas", "Active", "Activas")}
                </Link>
              </span>
            </div>
          </>
        )}
      </section>

      <section className="entity-search-results">
        <header>
          <div>
            <span>{tri(lang, "RESULTADOS", "RESULTS", "RESULTADOS")}</span>
            <h2>
              {total.toLocaleString(lang)}{" "}
              {tri(lang, "encontrados", "found", "encontrados")}
            </h2>
          </div>
        </header>
        {hasResults ? (
          <div className="entity-search-grid">
            {lists.map((list) => (
              <Link
                className="entity-result-card"
                href={`/${lang}/lists/${list.publicId}`}
                key={list.publicId}
              >
                <span className="entity-result-mark">
                  <Layers3 size={22} />
                </span>
                <span className="entity-result-copy">
                  <strong>{list.name}</strong>
                  <small>
                    {list.owner ? `@${list.owner} · ` : ""}
                    {list.itemCount} {tri(lang, "jogos", "games", "juegos")}
                  </small>
                  {list.description && <p>{list.description}</p>}
                </span>
              </Link>
            ))}
            {people.map((person) => (
              <Link
                className="entity-result-card"
                href={`/${lang}/u/${person.username}`}
                key={person.username}
              >
                <span className="entity-result-mark entity-result-avatar">
                  {person.avatarUrl ? (
                    <SafeImage
                      src={person.avatarUrl}
                      alt=""
                      fill
                      sizes="56px"
                    />
                  ) : (
                    <Users size={22} />
                  )}
                </span>
                <span className="entity-result-copy">
                  <strong>
                    {person.displayName || `@${person.username}`}
                    {person.verified && <VerifiedMark size={14} />}
                  </strong>
                  <small>@{person.username}</small>
                  {person.bio && <p>{person.bio}</p>}
                </span>
              </Link>
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
