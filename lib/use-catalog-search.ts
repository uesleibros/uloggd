"use client";

import { useEffect, useState } from "react";
import { catalogSearchResults } from "@/lib/catalog-search-result";
import type { TierlistGame } from "@/lib/tierlists";

/** Answers belong to their query and attempt, including during the debounce. */
export function useCatalogSearch(query: string, enabled = true) {
  const term = query.trim().replace(/\s+/g, " ").slice(0, 80);
  const active = enabled && term.length >= 2;
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState<{
    term: string;
    attempt: number;
    results: TierlistGame[];
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let listening = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/igdb/search?q=${encodeURIComponent(term)}&scope=games`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Catalogue search unavailable");
        const results = catalogSearchResults(await response.json());
        if (listening) setAnswer({ term, attempt, results, error: false });
      } catch {
        if (listening) setAnswer({ term, attempt, results: [], error: true });
      }
    }, 300);
    return () => {
      listening = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, term, attempt]);

  const current =
    active && answer?.term === term && answer.attempt === attempt
      ? answer
      : null;
  return {
    results: current?.results ?? [],
    loading: active && current === null,
    error: current?.error ?? false,
    reload: () => setAttempt((value) => value + 1),
  };
}
