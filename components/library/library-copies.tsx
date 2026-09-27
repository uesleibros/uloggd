"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Disc3, LoaderCircle, Search, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Select from "@/components/ui/select";
import { api } from "@/lib/api-client";
import {
  copyDetail,
  copyLabel,
  mediumLabel,
  ownershipLabel,
  storefrontLabel,
  type Copy,
} from "@/lib/library-copies";
import { COPIES_CHANGED_EVENT } from "@/lib/copies-event";
import { COPY_GROUPS, COPY_SORTS, type CopyGroup } from "@/lib/copy-browsing";
import { tri, type UiLang } from "@/lib/ui-text";

type CatalogGame = {
  id: number;
  slug: string;
  name: string;
  cover_url: string;
  release_year: number | null;
};

/**
 * One option of a facet, or one group of the result.
 *
 * `value` is the identity that goes in the address and `label` is what a
 * person reads. They are the same for a medium or a storefront, which this
 * side translates itself, and different for a platform, whose identity is the
 * catalogue id: a filter keyed on "PlayStation 5" is a filter that silently
 * stops filtering.
 */
type Facet = { value: string | null; label: string | null; copies: number };
type Answer = {
  data: Copy[];
  games?: CatalogGame[];
  facets?: Record<"platform" | "medium" | "ownership" | "storefront", Facet[]>;
  totals?: {
    copies: number;
    games: number;
    games_with_multiple_copies: number;
    games_on_multiple_platforms: number;
  };
  /**
   * How large each group of the result is, counted over all of it.
   *
   * The rows arrive a page at a time, so counting the ones on screen would
   * print "Steam, 24 copies" over the first page of forty.
   */
  group_counts?: Facet[];
  page: { size: number; has_more: boolean };
  next_cursor: string | null;
};

type FacetKey = "platform" | "medium" | "ownership" | "storefront";
const FACETS: FacetKey[] = ["platform", "medium", "ownership", "storefront"];
/** Past this many options a row of chips becomes a wall, so it becomes a menu. */
const CHIPS_AT_MOST = 6;

/**
 * The same library, counted by copy instead of by game.
 *
 * The library answers "which games are mine". This answers the other
 * questions about the same shelf: what do I have physically, what is on
 * Steam, what am I only renting, how many copies do I have for PS5, and which
 * games do I own more than once. A game appears once per copy, which is why
 * it is a view rather than a filter: the count of games has to keep meaning
 * games.
 *
 * Everything is asked of the server: the page, the order, the filters, the
 * search and the counts. It used to read the whole shelf and filter in the
 * browser, which works until somebody has two thousand copies and then works
 * for nobody.
 *
 * The view is in the address, so a filtered shelf can be reloaded, shared and
 * walked back out of.
 */
export function LibraryCopies({
  lang,
  update,
}: {
  lang: UiLang;
  /** The workspace owns the address; this only says what changed. */
  update: (
    values: Record<string, string | null>,
    options?: { push?: boolean },
  ) => void;
}) {
  const params = useSearchParams();
  const view = params.get("view") === "grid" ? "grid" : "list";
  const group = (COPY_GROUPS as readonly string[]).includes(
    params.get("group") ?? "",
  )
    ? (params.get("group") as CopyGroup)
    : "none";
  const sort = (COPY_SORTS as readonly string[]).includes(
    params.get("sort") ?? "",
  )
    ? params.get("sort")!
    : "newest";
  const chosen: Record<FacetKey, string | null> = {
    platform: params.get("platform"),
    medium: params.get("medium"),
    ownership: params.get("ownership"),
    storefront: params.get("storefront"),
  };
  const query = params.get("q") ?? "";

  const [typed, setTyped] = useState(query);
  // The address can change without this box: a back button, a shared link. The
  // documented way to follow a value like that is to adjust state during the
  // render that noticed, not in an effect, because an effect would leave one
  // paint showing the old text and, worse, the debounce below would push it
  // back over the address somebody just walked to.
  const [followed, setFollowed] = useState(query);
  if (query !== followed) {
    setFollowed(query);
    setTyped(query);
  }

  /**
   * Puts a search in the address, as a place somebody can come back to.
   *
   * Every view change here is a `push` rather than a replace, because each one
   * is a different question asked of the server: filtering to physical Steam
   * copies is somewhere you went, and the back button should bring you out of
   * it.
   */
  const search = (next: string) => {
    if (next === query) return;
    setFollowed(next);
    update({ q: next || null, cursor: null }, { push: true });
  };
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [pages, setPages] = useState<Copy[]>([]);
  const [games, setGames] = useState(new Map<number, CatalogGame>());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  // Every request carries the generation it was asked in. A slow answer to an
  // old question must not land on top of a new one, and it will: somebody
  // types "resi", then picks Steam, and the first answer arrives last.
  const generation = useRef(0);
  const live = useRef<AbortController | null>(null);

  const address = useMemo(() => {
    const search = new URLSearchParams();
    search.set("limit", "24");
    search.set("games", "1");
    search.set("facets", "1");
    search.set("sort", sort);
    if (group !== "none") search.set("group", group);
    if (query.trim()) search.set("q", query.trim());
    for (const facet of FACETS)
      if (chosen[facet]) search.set(facet, chosen[facet]!);
    return search.toString();
    // The chosen values are read out of the address, so the address is the
    // dependency.
  }, [params, sort, query, group]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(
    async (next: string | null) => {
      const mine = (generation.current += 1);
      live.current?.abort();
      const controller = new AbortController();
      live.current = controller;
      setLoading(true);
      try {
        const answered = await api.get<Answer>(
          `/library/copies?${address}${next ? `&cursor=${encodeURIComponent(next)}` : ""}`,
          controller.signal,
        );
        if (mine !== generation.current) return;
        setFailed(false);
        setAnswer(answered);
        setPages((before) =>
          next ? [...before, ...answered.data] : answered.data,
        );
        setGames((before) => {
          const merged = next
            ? new Map(before)
            : new Map<number, CatalogGame>();
          for (const game of answered.games ?? []) merged.set(game.id, game);
          return merged;
        });
        setCursor(answered.next_cursor);
      } catch {
        if (controller.signal.aborted || mine !== generation.current) return;
        setFailed(true);
      } finally {
        if (mine === generation.current) setLoading(false);
      }
    },
    [address],
  );

  useEffect(() => {
    // Out of the effect body rather than in it: the request sets state as it
    // goes, and doing that synchronously while React is committing is a
    // cascade the linter is right to refuse.
    const start = window.setTimeout(() => void load(null), 0);
    return () => window.clearTimeout(start);
  }, [load]);

  useEffect(() => {
    const again = () => void load(null);
    window.addEventListener(COPIES_CHANGED_EVENT, again);
    return () => window.removeEventListener(COPIES_CHANGED_EVENT, again);
  }, [load]);

  // What was typed reaches the address after a moment, so a search is one
  // request rather than one per keystroke. Enter does not wait.
  useEffect(() => {
    // Trimmed on both sides: a trailing space is not a different question, and
    // pushing one as though it were would leave a history entry that looks
    // identical to the one before it.
    if (typed.trim() === query) return;
    const timer = window.setTimeout(() => search(typed.trim()), 350);
    return () => window.clearTimeout(timer);
    // `search` is written fresh every render and is the same three lines every
    // time; listing it would restart the timer on each keystroke's render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, query, update]);

  const totals = answer?.totals;
  const facets = answer?.facets;
  const unset = tri(lang, "Sem definir", "Unset", "Sin definir");

  const label = (facet: FacetKey, option: Facet) =>
    facet === "medium"
      ? mediumLabel(option.value ?? "", lang)
      : facet === "ownership"
        ? ownershipLabel(option.value ?? "", lang)
        : facet === "storefront"
          ? storefrontLabel(option.value ?? "", lang)
          : // A platform is named by the catalogue, so the server sends the
            // name beside the id and nobody is ever shown a number.
            (option.label ?? option.value ?? unset);

  const groupName = (one: Facet) => {
    if (one.value === null) return unset;
    if (group === "platform") return one.label ?? one.value;
    if (group === "medium") return mediumLabel(one.value, lang);
    if (group === "ownership") return ownershipLabel(one.value, lang);
    if (group === "storefront") return storefrontLabel(one.value, lang);
    return one.value;
  };

  const grouped = useMemo(() => {
    if (group === "none") return null;
    const key = (copy: Copy): string | null =>
      group === "platform"
        ? copy.platform_id
          ? String(copy.platform_id)
          : (copy.platform_name ?? null)
        : ((copy[group] as string | null) ?? null);
    const buckets = new Map<string | null, Copy[]>();
    for (const copy of pages) {
      const at = key(copy);
      buckets.set(at, [...(buckets.get(at) ?? []), copy]);
    }
    // The server's order, which is by size, and the server's counts, which
    // are over the whole result rather than over what has been loaded. A
    // group with nothing on screen yet simply waits its turn.
    const counted = answer?.group_counts ?? [];
    const known = counted
      .filter((one) => buckets.has(one.value))
      .map((one) => ({
        value: one.value,
        name: groupName(one),
        copies: one.copies,
        rows: buckets.get(one.value) ?? [],
      }));
    // Anything loaded that the counts do not mention: only reachable if the
    // two disagreed, and better drawn than silently dropped.
    const missing = [...buckets.entries()]
      .filter(([at]) => !counted.some((one) => one.value === at))
      .map(([at, rows]) => ({
        value: at,
        name: groupName({ value: at, label: null, copies: rows.length }),
        copies: rows.length,
        rows,
      }));
    return [...known, ...missing];
    // `groupName` is a formatter over `lang` and the group, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, pages, lang, answer?.group_counts]);

  const facetTitle: Record<FacetKey, string> = {
    platform: tri(lang, "Plataforma", "Platform", "Plataforma"),
    medium: tri(lang, "Mídia", "Medium", "Medio"),
    ownership: tri(lang, "Posse", "Ownership", "Posesión"),
    storefront: tri(lang, "Loja", "Storefront", "Tienda"),
  };

  function choose(facet: FacetKey, value: string | null) {
    update({ [facet]: value, cursor: null }, { push: true });
  }

  const row = (copy: Copy) => {
    const game = games.get(copy.igdb_id);
    const detail = copyDetail(copy, lang);
    return (
      <li key={copy.id}>
        <Link href={`/${lang}/game/${game?.slug ?? copy.game_slug}`}>
          <span className="library-copies-cover">
            {game?.cover_url && (
              <Image src={game.cover_url} alt="" fill sizes="88px" />
            )}
          </span>
          <span className="library-copies-text">
            <strong>{game?.name ?? copy.game_slug}</strong>
            <span>{copyLabel(copy, lang)}</span>
            {detail && <small>{detail}</small>}
          </span>
        </Link>
      </li>
    );
  };

  const nothingAtAll =
    !loading &&
    !failed &&
    pages.length === 0 &&
    !query.trim() &&
    !FACETS.some((facet) => chosen[facet]);

  return (
    <section className="library-copies" data-view={view}>
      <header>
        <p>
          <Disc3 size={13} aria-hidden />
          {totals
            ? tri(
                lang,
                `${totals.copies} cópias de ${totals.games} jogos`,
                `${totals.copies} copies of ${totals.games} games`,
                `${totals.copies} copias de ${totals.games} juegos`,
              )
            : tri(lang, "Suas cópias", "Your copies", "Tus copias")}
          {totals && totals.games_with_multiple_copies > 0 && (
            <small>
              {tri(
                lang,
                `${totals.games_with_multiple_copies} mais de uma vez`,
                `${totals.games_with_multiple_copies} more than once`,
                `${totals.games_with_multiple_copies} más de una vez`,
              )}
            </small>
          )}
          {totals && totals.games_on_multiple_platforms > 0 && (
            <small>
              {tri(
                lang,
                `${totals.games_on_multiple_platforms} em mais de uma plataforma`,
                `${totals.games_on_multiple_platforms} on more than one platform`,
                `${totals.games_on_multiple_platforms} en más de una plataforma`,
              )}
            </small>
          )}
        </p>
      </header>

      <div className="library-copies-toolbar">
        <label className="search-field-hit library-copies-search">
          <Search size={15} aria-hidden />
          <input
            type="search"
            value={typed}
            onChange={(change) => setTyped(change.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search(typed.trim());
              }
            }}
            placeholder={tri(
              lang,
              "Buscar por título ou edição",
              "Search title or edition",
              "Buscar por título o edición",
            )}
            aria-label={tri(
              lang,
              "Buscar nas cópias",
              "Search copies",
              "Buscar en las copias",
            )}
          />
          {typed && (
            <button
              type="button"
              onClick={() => {
                setTyped("");
                search("");
              }}
              aria-label={tri(lang, "Limpar", "Clear", "Limpiar")}
            >
              <X size={14} />
            </button>
          )}
        </label>

        <Picker
          value={sort}
          onChange={(next) =>
            update({ sort: next, cursor: null }, { push: true })
          }
          options={[
            {
              value: "newest",
              label: tri(lang, "Mais recentes", "Newest", "Más recientes"),
            },
            {
              value: "oldest",
              label: tri(lang, "Mais antigas", "Oldest", "Más antiguas"),
            },
            { value: "title", label: tri(lang, "Título", "Title", "Título") },
            {
              value: "acquired",
              label: tri(lang, "Adquirida em", "Acquired", "Adquirida en"),
            },
          ]}
          label={tri(lang, "Ordenar", "Sort", "Ordenar")}
        />
        <Picker
          value={group}
          onChange={(next) =>
            update({ group: next === "none" ? null : next }, { push: true })
          }
          options={[
            {
              value: "none",
              label: tri(lang, "Sem grupo", "No grouping", "Sin grupo"),
            },
            { value: "platform", label: facetTitle.platform },
            { value: "medium", label: facetTitle.medium },
            { value: "ownership", label: facetTitle.ownership },
            { value: "storefront", label: facetTitle.storefront },
          ]}
          label={tri(lang, "Agrupar", "Group", "Agrupar")}
        />
        <div
          className="library-copies-views"
          role="group"
          aria-label={tri(lang, "Formato", "Layout", "Formato")}
        >
          <button
            type="button"
            data-active={view === "list" || undefined}
            aria-pressed={view === "list"}
            onClick={() => update({ view: null }, { push: true })}
          >
            {tri(lang, "Lista", "List", "Lista")}
          </button>
          <button
            type="button"
            data-active={view === "grid" || undefined}
            aria-pressed={view === "grid"}
            onClick={() => update({ view: "grid" }, { push: true })}
          >
            {tri(lang, "Grade", "Grid", "Cuadrícula")}
          </button>
        </div>
      </div>

      {facets && (
        <div className="library-copies-facets">
          {FACETS.map((facet) => {
            const options = facets[facet] ?? [];
            if (!options.length && !chosen[facet]) return null;
            return (
              <div className="library-copies-facet" key={facet}>
                <span>{facetTitle[facet]}</span>
                {options.length > CHIPS_AT_MOST ? (
                  <Picker
                    value={chosen[facet] ?? ""}
                    onChange={(next) => choose(facet, next || null)}
                    label={facetTitle[facet]}
                    options={[
                      {
                        value: "",
                        label: tri(lang, "Todas", "All", "Todas"),
                      },
                      ...options.map((option) => ({
                        // The identity goes in the address; the name is what
                        // is read. For a platform those are not the same
                        // string, and sending the name back would be a filter
                        // the server cannot honour.
                        value: option.value ?? "",
                        label: `${label(facet, option)} (${option.copies})`,
                      })),
                    ]}
                  />
                ) : (
                  <div role="group" aria-label={facetTitle[facet]}>
                    {options.map((option) => (
                      <button
                        key={option.value ?? ""}
                        type="button"
                        data-active={
                          chosen[facet] === option.value || undefined
                        }
                        aria-pressed={chosen[facet] === option.value}
                        onClick={() =>
                          choose(
                            facet,
                            chosen[facet] === option.value
                              ? null
                              : option.value,
                          )
                        }
                      >
                        {label(facet, option)}
                        <strong>{option.copies}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nothing to keep a place for when there is nothing: an empty region
          here left a hand's width of blank between the toolbar and the line
          explaining why the shelf is empty. */}
      {pages.length > 0 && (
        <div
          className="pending-region"
          data-stale={loading || undefined}
          aria-busy={loading || undefined}
        >
          {grouped ? (
            grouped.map(({ value, name, copies, rows }) => (
              <section className="library-copies-group" key={value ?? "unset"}>
                <h3>
                  {name}
                  <span>
                    {/* The size of the group, not the number of rows fetched so
                      far: a shelf of forty Steam copies says forty while the
                      first twenty-four are on screen. */}
                    {tri(
                      lang,
                      `${copies} ${copies === 1 ? "cópia" : "cópias"}`,
                      `${copies} ${copies === 1 ? "copy" : "copies"}`,
                      `${copies} ${copies === 1 ? "copia" : "copias"}`,
                    )}
                  </span>
                </h3>
                <ul className="library-copies-list">{rows.map(row)}</ul>
              </section>
            ))
          ) : (
            <ul className="library-copies-list">{pages.map(row)}</ul>
          )}
        </div>
      )}

      {loading && pages.length === 0 && (
        <p className="library-copies-empty">
          <LoaderCircle size={15} className="spin" aria-hidden />
        </p>
      )}

      {failed && (
        <p className="library-copies-empty">
          {tri(
            lang,
            "Não foi possível carregar suas cópias.",
            "Your copies could not be loaded.",
            "No se pudieron cargar tus copias.",
          )}
        </p>
      )}

      {!loading && !failed && pages.length === 0 && (
        <p className="library-copies-empty">
          {nothingAtAll
            ? tri(
                lang,
                "Você ainda não registrou nenhuma cópia. Elas ficam na página de cada jogo, em Suas cópias.",
                "You have not recorded a copy yet. They live on each game's page, under Your copies.",
                "Todavía no registraste ninguna copia. Están en la página de cada juego, en Tus copias.",
              )
            : query.trim()
              ? tri(
                  lang,
                  `Nenhuma cópia encontrada para "${query.trim()}".`,
                  `No copies found for "${query.trim()}".`,
                  `Ninguna copia encontrada para "${query.trim()}".`,
                )
              : tri(
                  lang,
                  "Nenhuma cópia com esses filtros.",
                  "No copies match those filters.",
                  "Ninguna copia con esos filtros.",
                )}
        </p>
      )}

      {cursor && (
        <button
          type="button"
          className="library-copies-more"
          disabled={loading}
          onClick={() => void load(cursor)}
        >
          {loading ? (
            <LoaderCircle size={14} className="spin" aria-hidden />
          ) : null}
          {tri(lang, "Carregar mais", "Load more", "Cargar más")}
        </button>
      )}
    </section>
  );
}

/** The one select shape this view needs, written once. */
function Picker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  const chosen = options.find((option) => option.value === value);
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="editor-select-trigger" aria-label={label}>
        <Select.Value>{chosen?.label ?? label}</Select.Value>
        <Select.Icon>
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="editor-select-menu"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="editor-select-option"
                key={option.value}
                value={option.value}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
