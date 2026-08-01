"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Clock3,
  Layers3,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { GameSearchResult } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/client";
import { SpawndLogo } from "./spawnd-logo";
import { VerifiedNameMark } from "./verified-badge";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type SearchList = { id: string; name: string; owner: string | null };
type SearchPerson = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  organization: boolean;
};
type SearchPayload = {
  results: GameSearchResult[];
  lists: SearchList[];
  people: SearchPerson[];
};

const emptyPayload: SearchPayload = { results: [], lists: [], people: [] };
const searchCache = new Map<string, SearchPayload>();

function useGameSearch(cacheScope: string) {
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SearchPayload>(emptyPayload);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const currentQueryRef = useRef("");

  useEffect(() => {
    const clearPersonalizedCache = () => searchCache.clear();
    window.addEventListener("uloggd:cover-changed", clearPersonalizedCache);
    return () =>
      window.removeEventListener(
        "uloggd:cover-changed",
        clearPersonalizedCache,
      );
  }, []);

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length < 2) return;
    const cacheKey = `${cacheScope}:${normalized}`;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        if (currentQueryRef.current !== normalized) return;
        setPayload(cached);
        setStatus("ready");
        return;
      }
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/igdb/search?q=${encodeURIComponent(normalized)}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error("Search request failed");
        const data = (await response.json()) as Partial<SearchPayload>;
        const next: SearchPayload = {
          results: Array.isArray(data.results) ? data.results : [],
          lists: Array.isArray(data.lists) ? data.lists : [],
          people: Array.isArray(data.people) ? data.people : [],
        };
        searchCache.set(cacheKey, next);
        if (currentQueryRef.current !== normalized) return;
        setPayload(next);
        setStatus("ready");
      } catch (error) {
        if (
          (error as Error).name !== "AbortError" &&
          currentQueryRef.current === normalized
        ) {
          setPayload(emptyPayload);
          setStatus("error");
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cacheScope, query]);

  const updateQuery = useCallback(
    (value: string) => {
      const normalized = value.trim().toLocaleLowerCase();
      const cached = searchCache.get(`${cacheScope}:${normalized}`);
      currentQueryRef.current = normalized;
      setQuery(value);
      setPayload(cached ?? emptyPayload);
      setStatus(normalized.length < 2 ? "idle" : cached ? "ready" : "loading");
    },
    [cacheScope],
  );

  return {
    query,
    setQuery: updateQuery,
    results: payload.results,
    lists: payload.lists,
    people: payload.people,
    status,
  };
}

/**
 * Every row the panel offers, in the order they appear, flattened across the
 * games, people and lists sections.
 *
 * Arrow keys used to walk the games array alone, so the people and lists a
 * search surfaced were reachable with a mouse and invisible to a keyboard.
 * Both the key handler and the renderer derive their indices from this one
 * function, because two lists that must agree on an ordering will not stay
 * agreed if they are written twice.
 */
export type SearchOption = {
  href: string;
  /** Games are remembered as recently viewed; the other kinds are not. */
  game?: GameSearchResult;
};

export function navigableOptions(
  lang: UiLang,
  query: string,
  recent: GameSearchResult[],
  results: GameSearchResult[],
  people: SearchPerson[],
  lists: SearchList[],
): SearchOption[] {
  if (query.trim().length < 2)
    return recent.map((game) => ({
      href: `/${lang}/game/${game.slug}`,
      game,
    }));
  return [
    ...results.map((game) => ({ href: `/${lang}/game/${game.slug}`, game })),
    ...people.map((person) => ({ href: `/${lang}/u/${person.username}` })),
    ...lists.map((list) => ({ href: `/${lang}/lists/${list.id}` })),
  ];
}

function ResultList({
  dictionary: d,
  results,
  lists,
  people,
  status,
  query,
  activeIndex,
  onActiveIndex,
  listId,
  lang,
  onSelect,
  onNavigate,
  recent,
  recentLoading,
  onClearRecent,
}: {
  dictionary: Dictionary;
  results: GameSearchResult[];
  lists: SearchList[];
  people: SearchPerson[];
  status: "idle" | "loading" | "ready" | "error";
  query: string;
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  listId: string;
  lang: UiLang;
  onSelect?: (game: GameSearchResult) => void;
  onNavigate?: () => void;
  recent: GameSearchResult[];
  recentLoading: boolean;
  onClearRecent: () => void;
}) {
  if (status === "loading") {
    return (
      <div className="search-message">
        <LoaderCircle className="spin" size={17} />
        {d.search.loading}
      </div>
    );
  }
  if (status === "error")
    return (
      <div className="search-message search-message-error">
        {d.search.error}
      </div>
    );
  // Recently viewed is fetched (view history, then IGDB) before the panel can
  // list anything, so an empty panel here means "still loading", not "empty".
  if (query.trim().length < 2 && recentLoading)
    return (
      <div className="search-message">
        <LoaderCircle className="spin" size={17} />
        {d.search.loading}
      </div>
    );
  if (query.trim().length < 2)
    return recent.length ? (
      <div className="search-results search-recent-results">
        <div className="search-results-label">
          <span>
            {tri(
              lang,
              "Vistos recentemente",
              "Recently viewed",
              "Vistos recientemente",
            )}
          </span>
          <button type="button" onClick={onClearRecent}>
            <Trash2 size={12} />
            {tri(lang, "Limpar", "Clear", "Limpiar")}
          </button>
        </div>
        <div
          role="listbox"
          id={listId}
          aria-label={tri(
            lang,
            "Jogos recentes",
            "Recent games",
            "Juegos recientes",
          )}
        >
          {recent.map((game, index) => (
            <Link
              key={game.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onMouseEnter={() => onActiveIndex(index)}
              href={`/${lang}/game/${game.slug}`}
              className="search-result"
              onClick={() => onSelect?.(game)}
            >
              <span className="search-result-cover">
                <Image src={game.coverUrl} alt="" fill sizes="44px" />
              </span>
              <span className="search-result-copy">
                <strong>{game.name}</strong>
                <small>
                  {[game.releaseYear, ...game.platforms]
                    .filter(Boolean)
                    .join(" · ") || d.search.kind[game.kind]}
                </small>
              </span>
              <span className="search-result-badges">
                {game.spawndAvailable && (
                  <span
                    className="search-result-spawnd"
                    aria-label={tri(
                      lang,
                      "Jogável no spawnd",
                      "Playable on spawnd",
                      "Jugable en spawnd",
                    )}
                  >
                    <SpawndLogo compact />
                    <span>{tri(lang, "Jogável", "Playable", "Jugable")}</span>
                  </span>
                )}
                {!game.spawndAvailable && (
                  <Clock3 size={14} className="search-recent-icon" />
                )}
              </span>
            </Link>
          ))}
        </div>
      </div>
    ) : (
      <div className="search-message">{d.search.start}</div>
    );
  if (
    status === "ready" &&
    results.length === 0 &&
    people.length === 0 &&
    lists.length === 0
  )
    return <div className="search-message">{d.search.empty}</div>;

  const t = uiText(lang);
  // One listbox for the whole panel, with a labelled group per section. Three
  // separate lists could not carry a single active option between them, which
  // is what `aria-activedescendant` on the input has to point at.
  const peopleLabel = tri(lang, "Pessoas", "People", "Personas");
  return (
    <div
      className="search-results"
      role="listbox"
      id={listId}
      aria-label={d.search.results}
    >
      {results.length > 0 && (
        <div className="search-results-label" aria-hidden="true">
          <span>{d.search.results}</span>
          <span>{results.length}</span>
        </div>
      )}
      <div role="group" aria-label={d.search.results}>
        {results.map((game, index) => (
          <Link
            key={game.id}
            id={`${listId}-${index}`}
            href={`/${lang}/game/${game.slug}`}
            role="option"
            aria-selected={activeIndex === index}
            aria-label={d.search.openGame.replace("{game}", game.name)}
            onMouseEnter={() => onActiveIndex(index)}
            className="search-result"
            onClick={() => onSelect?.(game)}
          >
            <span className="search-result-cover">
              <Image src={game.coverUrl} alt="" fill sizes="44px" />
            </span>
            <span className="search-result-copy">
              <strong>{game.name}</strong>
              <small>
                {[game.releaseYear, ...game.platforms]
                  .filter(Boolean)
                  .join(" · ") || d.search.kind[game.kind]}
              </small>
            </span>
            <span className="search-result-badges">
              {game.spawndAvailable && (
                <span
                  className="search-result-spawnd"
                  aria-label={tri(
                    lang,
                    "Jogável no spawnd",
                    "Playable on spawnd",
                    "Jugable en spawnd",
                  )}
                >
                  <SpawndLogo compact />
                  <span>{tri(lang, "Jogável", "Playable", "Jugable")}</span>
                </span>
              )}
              {game.kind !== "game" && (
                <span className="search-result-kind">
                  {d.search.kind[game.kind]}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
      {people.length > 0 && (
        <>
          <div className="search-results-label" aria-hidden="true">
            <span>{peopleLabel}</span>
          </div>
          <div role="group" aria-label={peopleLabel}>
            {people.map((person, offset) => {
              const index = results.length + offset;
              return (
                <Link
                  key={person.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => onActiveIndex(index)}
                  href={`/${lang}/u/${person.username}`}
                  className="search-result"
                  onClick={onNavigate}
                >
                  <span
                    className="search-result-cover search-result-avatar"
                    data-account-type={
                      person.organization ? "ORGANIZATION" : undefined
                    }
                  >
                    {person.avatarUrl ? (
                      <Image
                        src={person.avatarUrl}
                        alt=""
                        fill
                        sizes="44px"
                        unoptimized
                      />
                    ) : (
                      person.username.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="search-result-copy">
                    <strong>
                      {person.displayName || `@${person.username}`}
                      {person.verified && <VerifiedNameMark />}
                    </strong>
                    <small>
                      @{person.username}
                      {person.organization && (
                        <b className="search-result-org">
                          {tri(
                            lang,
                            "Organização",
                            "Organization",
                            "Organización",
                          )}
                        </b>
                      )}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
      {lists.length > 0 && (
        <>
          <div className="search-results-label" aria-hidden="true">
            <span>{t.lists}</span>
          </div>
          <div role="group" aria-label={t.lists}>
            {lists.map((list, offset) => {
              const index = results.length + people.length + offset;
              return (
                <Link
                  key={list.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => onActiveIndex(index)}
                  href={`/${lang}/lists/${list.id}`}
                  className="search-result"
                  onClick={onNavigate}
                >
                  <span className="search-result-cover search-result-list-mark">
                    <Layers3 size={18} />
                  </span>
                  <span className="search-result-copy">
                    <strong>{list.name}</strong>
                    <small>
                      {list.owner ? `@${list.owner} · ${t.list}` : t.list}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SearchSurface({
  dictionary: d,
  mobile = false,
  lang,
  onSelect,
  cacheScope,
}: {
  dictionary: Dictionary;
  mobile?: boolean;
  lang: UiLang;
  onSelect?: () => void;
  cacheScope: string;
}) {
  const router = useRouter();
  const { query, setQuery, results, lists, people, status } =
    useGameSearch(cacheScope);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState(mobile);
  const [recent, setRecent] = useState<GameSearchResult[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const optionCount = navigableOptions(
    lang,
    query,
    recent,
    results,
    people,
    lists,
  ).length;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const settle = () => {
      if (active) setRecentLoading(false);
    };
    void (async () => {
      // Recently viewed comes from the view history (record_content_view on the
      // game pages), so it's the same list everywhere and follows the account
      // across devices. RLS scopes the rows to the signed-in viewer already.
      const { data } = await createClient()
        .from("content_views")
        .select("game_igdb_id")
        .eq("content_type", "game")
        .order("viewed_at", { ascending: false })
        .limit(6);
      const ids = (data ?? [])
        .map((row) => row.game_igdb_id as number | null)
        .filter((id): id is number => typeof id === "number");
      if (!active) return;
      if (!ids.length) return settle();
      try {
        const response = await fetch(`/api/igdb/search?ids=${ids.join(",")}`, {
          signal: controller.signal,
        });
        if (!response.ok) return settle();
        const payload = (await response.json()) as {
          results?: GameSearchResult[];
        };
        const byId = new Map(
          (payload.results ?? []).map((game) => [game.id, game]),
        );
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((game): game is GameSearchResult => Boolean(game));
        if (!active) return;
        setRecent(ordered);
        settle();
      } catch (error) {
        // An abort means the surface went away; leave the spinner in place
        // rather than flashing "no history" on the way out.
        if ((error as Error).name !== "AbortError") settle();
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);
  // Optimistic bump, opening the game records the real view server-side.
  const remember = useCallback((game: GameSearchResult) => {
    setRecent((current) =>
      [game, ...current.filter((item) => item.id !== game.id)].slice(0, 6),
    );
  }, []);
  const clearRecent = useCallback(() => {
    setRecent([]);
    setRecentLoading(false);
    void createClient()
      .from("content_views")
      .delete()
      .eq("content_type", "game");
  }, []);
  useEffect(() => {
    if (mobile) window.setTimeout(() => inputRef.current?.focus(), 80);
  }, [mobile]);
  useEffect(() => {
    if (mobile) return;
    function focusSearch(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !target.closest("input, textarea, [contenteditable='true']")
      ) {
        event.preventDefault();
        setExpanded(true);
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, [mobile]);
  useEffect(() => {
    if (mobile) return;
    function closeOutside(event: Event) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setExpanded(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [mobile]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // Walks games, people and lists as one sequence, so every row the panel
      // shows can be reached without a mouse.
      const options = navigableOptions(
        lang,
        query,
        recent,
        results,
        people,
        lists,
      );
      if (event.key === "ArrowDown" && options.length) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % options.length);
      } else if (event.key === "ArrowUp" && options.length) {
        event.preventDefault();
        setActiveIndex((current) =>
          current <= 0 ? options.length - 1 : current - 1,
        );
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        const selected = options[activeIndex];
        if (!selected) return;
        // Only games belong in recently viewed, so the other kinds skip it.
        if (selected.game) remember(selected.game);
        router.push(selected.href);
        setExpanded(false);
        onSelect?.();
      } else if (event.key === "Enter" && query.trim().length >= 2) {
        event.preventDefault();
        router.push(`/${lang}/search?q=${encodeURIComponent(query.trim())}`);
        setExpanded(false);
        onSelect?.();
      } else if (event.key === "Escape" && !mobile) {
        setExpanded(false);
        inputRef.current?.blur();
      }
    },
    [
      activeIndex,
      lang,
      lists,
      mobile,
      onSelect,
      people,
      query,
      recent,
      remember,
      results,
      router,
    ],
  );

  return (
    <div
      ref={containerRef}
      className={mobile ? "mobile-search-surface" : "desktop-search-surface"}
    >
      <label className="catalog-search-field">
        <Search size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setActiveIndex(-1);
            setQuery(event.target.value);
            setExpanded(true);
          }}
          onFocus={() => setExpanded(true)}
          onKeyDown={handleKeyDown}
          placeholder={d.search.placeholder}
          aria-label={d.search.label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={expanded}
          // Results can shrink while a row is active, so this points at an
          // option only while that option still exists. A dangling reference
          // makes a screen reader announce nothing at all.
          aria-activedescendant={
            activeIndex >= 0 && activeIndex < optionCount
              ? `${listId}-${activeIndex}`
              : undefined
          }
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setActiveIndex(-1);
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={d.search.clear}
          >
            <X size={16} />
          </button>
        )}
        {!mobile && <kbd>/</kbd>}
      </label>
      {(mobile || expanded) && (
        <div
          className={
            mobile ? "mobile-search-results" : "desktop-search-dropdown"
          }
        >
          <ResultList
            dictionary={d}
            results={results}
            lists={lists}
            people={people}
            status={status}
            query={query}
            activeIndex={activeIndex}
            onActiveIndex={setActiveIndex}
            listId={listId}
            lang={lang}
            recent={recent}
            recentLoading={recentLoading}
            onClearRecent={clearRecent}
            onSelect={(game) => {
              remember(game);
              setExpanded(false);
              onSelect?.();
            }}
            onNavigate={() => {
              setExpanded(false);
              onSelect?.();
            }}
          />
          <Link
            className="advanced-search-link"
            href={`/${lang}/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`}
            onClick={() => {
              setExpanded(false);
              onSelect?.();
            }}
          >
            <SlidersHorizontal size={14} />
            <span>
              {tri(
                lang,
                "Abrir busca avançada",
                "Open advanced search",
                "Abrir búsqueda avanzada",
              )}
            </span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

export function DesktopGameSearch({
  dictionary,
  lang,
  cacheScope,
}: {
  dictionary: Dictionary;
  lang: UiLang;
  cacheScope: string;
}) {
  return (
    <SearchSurface
      dictionary={dictionary}
      lang={lang}
      cacheScope={cacheScope}
    />
  );
}

export function MobileGameSearch({
  dictionary: d,
  lang,
  cacheScope,
}: {
  dictionary: Dictionary;
  lang: UiLang;
  cacheScope: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="mobile-search-trigger"
          aria-label={d.platform.openSearch}
        >
          <Search size={21} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="search-modal-backdrop" />
        <Dialog.Content className="mobile-search-modal">
          <header className="mobile-search-heading">
            <div>
              <Dialog.Title>{d.search.mobileTitle}</Dialog.Title>
              <Dialog.Description>
                {d.search.mobileDescription}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={d.search.close}>
              <X size={20} />
            </Dialog.Close>
          </header>
          <SearchSurface
            dictionary={d}
            lang={lang}
            cacheScope={cacheScope}
            mobile
            onSelect={() => setOpen(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
