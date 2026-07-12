"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { LoaderCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { GameSearchResult } from "@/lib/igdb";

const searchCache = new Map<string, GameSearchResult[]>();

function useGameSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );

  useEffect(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (normalized.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const cached = searchCache.get(normalized);
      if (cached) {
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
        searchCache.set(normalized, nextResults);
        setResults(nextResults);
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setStatus("error");
        }
      }
    }, 280);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const updateQuery = useCallback((value: string) => {
    setQuery(value);
    setResults([]);
    setStatus(value.trim().length < 2 ? "idle" : "loading");
  }, []);

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
}: {
  dictionary: Dictionary;
  results: GameSearchResult[];
  status: "idle" | "loading" | "ready" | "error";
  query: string;
  activeIndex: number;
  onActiveIndex: (index: number) => void;
  listId: string;
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
    return <div className="search-message">{d.search.start}</div>;
  if (status === "ready" && results.length === 0)
    return <div className="search-message">{d.search.empty}</div>;

  return (
    <div
      className="search-results"
      role="listbox"
      id={listId}
      aria-label={d.search.results}
    >
      <div className="search-results-label">
        <span>{d.search.results}</span>
      </div>
      {results.map((game, index) => (
        <a
          key={game.id}
          id={`${listId}-${index}`}
          href={`https://www.igdb.com/games/${game.slug}`}
          target="_blank"
          rel="noreferrer"
          role="option"
          aria-selected={activeIndex === index}
          aria-label={d.search.openGame.replace("{game}", game.name)}
          onMouseEnter={() => onActiveIndex(index)}
          className="search-result"
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
          {game.kind !== "game" && (
            <span className="search-result-kind">
              {d.search.kind[game.kind]}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}

function SearchSurface({
  dictionary: d,
  mobile = false,
}: {
  dictionary: Dictionary;
  mobile?: boolean;
}) {
  const { query, setQuery, results, status } = useGameSearch();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState(mobile);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && results.length) {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % results.length);
      } else if (event.key === "ArrowUp" && results.length) {
        event.preventDefault();
        setActiveIndex((current) =>
          current <= 0 ? results.length - 1 : current - 1,
        );
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        window.open(
          `https://www.igdb.com/games/${results[activeIndex].slug}`,
          "_blank",
          "noopener,noreferrer",
        );
      } else if (event.key === "Escape" && !mobile) {
        setExpanded(false);
        inputRef.current?.blur();
      }
    },
    [activeIndex, mobile, results],
  );

  return (
    <div
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
          onBlur={() => window.setTimeout(() => setExpanded(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={d.search.placeholder}
          aria-label={d.search.label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={query.trim().length >= 2}
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
      {(mobile || (expanded && query.trim().length >= 2)) && (
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
          />
        </div>
      )}
    </div>
  );
}

export function DesktopGameSearch({ dictionary }: { dictionary: Dictionary }) {
  return <SearchSurface dictionary={dictionary} />;
}

export function MobileGameSearch({
  dictionary: d,
}: {
  dictionary: Dictionary;
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
          <SearchSurface dictionary={d} mobile />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
