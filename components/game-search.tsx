"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, LoaderCircle, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { GameSearchResult } from "@/lib/igdb";
import { SpawndLogo } from "./spawnd-logo";

const searchCache = new Map<string, GameSearchResult[]>();
const RECENT_SEARCHES_KEY = "uloggd:recent-games";

function useGameSearch(cacheScope: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
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
        setResults(cached);
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
        const data = (await response.json()) as {
          results?: GameSearchResult[];
        };
        const nextResults = Array.isArray(data.results) ? data.results : [];
        searchCache.set(cacheKey, nextResults);
        if (currentQueryRef.current !== normalized) return;
        setResults(nextResults);
        setStatus("ready");
      } catch (error) {
        if (
          (error as Error).name !== "AbortError" &&
          currentQueryRef.current === normalized
        ) {
          setResults([]);
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
      setResults(cached ?? []);
      setStatus(normalized.length < 2 ? "idle" : cached ? "ready" : "loading");
    },
    [cacheScope],
  );

  return { query, setQuery: updateQuery, results, status };
}

function ResultList({
  dictionary: d,
  results,
  status,
  query,
  activeIndex,
  onActiveIndex,
  listId,
  lang,
  onSelect,
  recent,
  onClearRecent,
}: {
  dictionary: Dictionary;
  results: GameSearchResult[];
  status: "idle" | "loading" | "ready" | "error";
  query: string;
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  listId: string;
  lang: "pt-BR" | "en";
  onSelect?: (game: GameSearchResult) => void;
  recent: GameSearchResult[];
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
  if (query.trim().length < 2)
    return recent.length ? (
      <div className="search-results search-recent-results">
        <div className="search-results-label">
          <span>
            {lang === "pt-BR" ? "Vistos recentemente" : "Recently viewed"}
          </span>
          <button type="button" onClick={onClearRecent}>
            <Trash2 size={12} />
            {lang === "pt-BR" ? "Limpar" : "Clear"}
          </button>
        </div>
        <div
          role="listbox"
          id={listId}
          aria-label={lang === "pt-BR" ? "Jogos recentes" : "Recent games"}
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
                    title={
                      lang === "pt-BR"
                        ? "Jogável no spawnd"
                        : "Playable on spawnd"
                    }
                  >
                    <SpawndLogo compact />
                    <span>{lang === "pt-BR" ? "Jogável" : "Playable"}</span>
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
  if (status === "ready" && results.length === 0)
    return <div className="search-message">{d.search.empty}</div>;

  return (
    <div className="search-results">
      <div className="search-results-label">
        <span>{d.search.results}</span>
        <span>{results.length}</span>
      </div>
      <div role="listbox" id={listId} aria-label={d.search.results}>
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
                  title={
                    lang === "pt-BR"
                      ? "Jogável no spawnd"
                      : "Playable on spawnd"
                  }
                >
                  <SpawndLogo compact />
                  <span>{lang === "pt-BR" ? "Jogável" : "Playable"}</span>
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
  lang: "pt-BR" | "en";
  onSelect?: () => void;
  cacheScope: string;
}) {
  const router = useRouter();
  const { query, setQuery, results, status } = useGameSearch(cacheScope);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState(mobile);
  const [recent, setRecent] = useState<GameSearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const controller = new AbortController();
    try {
      const stored = JSON.parse(
        localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
      );
      if (Array.isArray(stored)) {
        const initial = (stored as GameSearchResult[]).slice(0, 6);
        const timer = window.setTimeout(() => setRecent(initial), 0);
        if (initial.length) {
          void fetch(
            `/api/igdb/search?ids=${initial.map((game) => game.id).join(",")}`,
            {
              signal: controller.signal,
            },
          )
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: { results?: GameSearchResult[] } | null) => {
              if (!payload?.results) return;
              const refreshed = new Map(
                payload.results.map((game) => [game.id, game]),
              );
              const next = initial.map(
                (game) => refreshed.get(game.id) ?? game,
              );
              setRecent(next);
              localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
            })
            .catch((error: Error) => {
              if (error.name !== "AbortError") return;
            });
        }
        return () => {
          window.clearTimeout(timer);
          controller.abort();
        };
      }
    } catch {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    }
    return () => controller.abort();
  }, []);
  const remember = useCallback((game: GameSearchResult) => {
    setRecent((current) => {
      const next = [
        game,
        ...current.filter((item) => item.id !== game.id),
      ].slice(0, 6);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const clearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecent([]);
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
      const visibleResults = query.trim().length < 2 ? recent : results;
      if (event.key === "ArrowDown" && visibleResults.length) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % visibleResults.length);
      } else if (event.key === "ArrowUp" && visibleResults.length) {
        event.preventDefault();
        setActiveIndex((current) =>
          current <= 0 ? visibleResults.length - 1 : current - 1,
        );
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        const selected =
          query.trim().length < 2 ? recent[activeIndex] : results[activeIndex];
        if (!selected) return;
        remember(selected);
        router.push(`/${lang}/game/${selected.slug}`);
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
      mobile,
      onSelect,
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
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
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
            status={status}
            query={query}
            activeIndex={activeIndex}
            onActiveIndex={setActiveIndex}
            listId={listId}
            lang={lang}
            recent={recent}
            onClearRecent={clearRecent}
            onSelect={(game) => {
              remember(game);
              setExpanded(false);
              onSelect?.();
            }}
          />
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
  lang: "pt-BR" | "en";
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
  lang: "pt-BR" | "en";
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
