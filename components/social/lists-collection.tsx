"use client";

import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ListPreview } from "@/lib/lists-types";
import { uiText } from "@/lib/ui-text";
import { ListPreviewCard } from "./list-preview-card";

/**
 * Owns search and pagination together, because they share the same cursor:
 * typing restarts the list from the server rather than filtering only what
 * happens to be loaded. Mirrors the header search — debounce, abort on
 * keystroke, spinner while in flight.
 */
export function ListsCollection({
  lang,
  ownerId,
  initial,
  total,
  pageSize,
  hasMore,
}: {
  lang: "pt-BR" | "en";
  ownerId: string;
  initial: ListPreview[];
  total: number;
  pageSize: number;
  hasMore: boolean;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [query, setQuery] = useState("");
  // Everything the client has fetched is kept under the query it belongs to,
  // so clearing the box falls straight back to the server-rendered list and a
  // stale "no more results" from a search cannot leak into the full list.
  const [fetched, setFetched] = useState<{
    key: string;
    rows: ListPreview[];
    exhausted: boolean;
  } | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const activeQuery = useRef("");

  const normalized = query.trim();
  const searched = Boolean(normalized);
  const mine = fetched?.key === normalized ? fetched : null;
  const lists = mine ? mine.rows : searched ? [] : initial;
  const done = mine ? mine.exhausted : searched ? true : !hasMore;

  useEffect(() => {
    const term = query.trim();
    activeQuery.current = term;
    if (!term) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          profile: ownerId,
          q: term,
          limit: String(pageSize),
        });
        const response = await fetch(`/api/lists?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const { lists: rows } = (await response.json()) as {
          lists: ListPreview[];
        };
        if (activeQuery.current !== term) return;
        setFetched({ key: term, rows, exhausted: rows.length < pageSize });
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setError(true);
      } finally {
        if (activeQuery.current === term) setSearching(false);
      }
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, ownerId, pageSize]);

  async function loadMore() {
    const cursor = lists[lists.length - 1]?.updatedAt;
    if (loadingMore || done || !cursor) return;
    setLoadingMore(true);
    setError(false);
    try {
      const params = new URLSearchParams({
        profile: ownerId,
        before: cursor,
        limit: String(pageSize),
      });
      if (normalized) params.set("q", normalized);
      const response = await fetch(`/api/lists?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      const { lists: next } = (await response.json()) as {
        lists: ListPreview[];
      };
      setFetched({
        key: normalized,
        rows: next.length ? [...lists, ...next] : lists,
        exhausted: next.length < pageSize,
      });
    } catch {
      setError(true);
    }
    setLoadingMore(false);
  }

  return (
    <section className="lists-collection">
      <header>
        <div>
          <h2>{pt ? "Todas as listas" : "All lists"}</h2>
          <p>
            {searched
              ? pt
                ? "Resultados da busca"
                : "Search results"
              : pt
                ? "Atualizadas recentemente primeiro"
                : "Recently updated first"}
          </p>
        </div>
        <form
          className="lists-search"
          role="search"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="search-field-hit">
            {searching ? (
              <LoaderCircle className="spin" size={15} aria-hidden />
            ) : (
              <Search size={15} aria-hidden />
            )}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={60}
              aria-label={pt ? "Buscar nas suas listas" : "Search your lists"}
              placeholder={pt ? "Buscar lista" : "Search list"}
            />
          </label>
          <button
            type="button"
            className="lists-search-clear"
            data-hidden={!query ? true : undefined}
            aria-label={t.clear}
            onClick={() => setQuery("")}
          >
            <X size={14} />
          </button>
        </form>
        <span>{searched ? lists.length : total}</span>
      </header>

      {lists.length > 0 && (
        <div className="lists-row" aria-busy={searching || undefined}>
          {lists.map((list) => (
            <ListPreviewCard
              key={list.id}
              list={{
                id: list.id,
                name: list.name,
                description: list.description,
                visibility: list.visibility,
                count: list.count,
              }}
              covers={list.covers}
              lang={lang}
              likes={list.likes}
            />
          ))}
        </div>
      )}

      {!lists.length && !searching && searched && (
        <p className="lists-search-empty">
          {pt
            ? `Nenhuma lista com “${query.trim()}”.`
            : `No list matching “${query.trim()}”.`}
        </p>
      )}

      {!done && lists.length > 0 && (
        <div className="load-more-row">
          <button type="button" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? (
              <LoaderCircle className="spin" size={15} aria-hidden />
            ) : (
              <Plus size={15} aria-hidden />
            )}
            {loadingMore
              ? pt
                ? "Carregando…"
                : "Loading…"
              : pt
                ? "Carregar mais"
                : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p className="lists-search-empty" role="alert">
          {pt ? "Não foi possível carregar." : "Could not load."}
        </p>
      )}
    </section>
  );
}
