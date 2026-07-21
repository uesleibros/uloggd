"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uiText, type UiLang } from "@/lib/ui-text";

type SearchResult = {
  id: number;
  slug: string;
  name: string;
  coverUrl: string;
  releaseYear: number | null;
};

export function ListAddGame({
  listId,
  existingIds,
  lang,
}: {
  listId: string;
  existingIds: number[];
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const response = await fetch(
          `/api/igdb/search?q=${encodeURIComponent(normalized)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          results?: SearchResult[];
        };
        setResults((payload.results ?? []).slice(0, 8));
        setSearching(false);
      } catch {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function add(game: SearchResult) {
    if (addingId !== null) return;
    setAddingId(game.id);
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "add_game_to_list",
      {
        target_list: listId,
        game_id: game.id,
        game_slug: game.slug,
      },
    );
    if (actionError) setError(true);
    else {
      setAdded((current) => [...current, game.id]);
      router.refresh();
    }
    setAddingId(null);
  }

  const inList = new Set([...existingIds, ...added]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) handleQueryChange("");
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="list-add-game-trigger">
          <Plus size={15} /> {pt ? "Adicionar jogos" : "Add games"}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content
          className="social-editor-dialog list-add-game-dialog"
          aria-describedby={undefined}
        >
          <header>
            <div>
              <span>{pt ? "CATÁLOGO" : "CATALOG"}</span>
              <Dialog.Title>
                {pt ? "Adicionar jogos à lista" : "Add games to the list"}
              </Dialog.Title>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={19} />
            </Dialog.Close>
          </header>
          <div className="list-add-game">
            <label>
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                placeholder={
                  pt ? "Buscar jogo para adicionar…" : "Search a game to add…"
                }
                aria-label={pt ? "Buscar jogo" : "Search game"}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  aria-label={t.clear}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            {error && (
              <p className="social-form-error" role="alert">
                {pt ? "Não foi possível adicionar." : "Could not add."}
              </p>
            )}
            {query.trim().length >= 2 ? (
              <div className="list-add-game-results" aria-busy={searching}>
                {searching && !results.length ? (
                  <p>{pt ? "Buscando…" : "Searching…"}</p>
                ) : results.length ? (
                  results.map((game) => {
                    const already = inList.has(game.id);
                    return (
                      <div className="list-add-game-row" key={game.id}>
                        <span className="list-add-game-cover">
                          {game.coverUrl && (
                            <Image
                              src={game.coverUrl}
                              alt=""
                              fill
                              sizes="40px"
                            />
                          )}
                        </span>
                        <span className="list-add-game-copy">
                          <strong>{game.name}</strong>
                          {game.releaseYear && (
                            <small>{game.releaseYear}</small>
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={already || addingId !== null}
                          onClick={() => add(game)}
                        >
                          {addingId === game.id ? (
                            <LoaderCircle
                              className="spin"
                              size={13}
                              aria-hidden
                            />
                          ) : (
                            <Plus size={13} />
                          )}
                          {already
                            ? pt
                              ? "Na lista"
                              : "In list"
                            : pt
                              ? "Adicionar"
                              : "Add"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>{pt ? "Nenhum jogo encontrado." : "No games found."}</p>
                )}
              </div>
            ) : (
              <p className="list-add-game-empty">
                {pt
                  ? "Digite ao menos duas letras para buscar no catálogo."
                  : "Type at least two letters to search the catalog."}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
