"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

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
          <Plus size={15} />{" "}
          {tri(lang, "Adicionar jogos", "Add games", "Añadir juegos")}
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
              <Dialog.Title>
                {tri(
                  lang,
                  "Adicionar jogos à lista",
                  "Add games to the list",
                  "Añadir juegos a la lista",
                )}
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
                placeholder={tri(
                  lang,
                  "Buscar jogo para adicionar…",
                  "Search a game to add…",
                  "Busca un juego para añadir…",
                )}
                aria-label={tri(
                  lang,
                  "Buscar jogo",
                  "Search game",
                  "Buscar juego",
                )}
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
                {tri(
                  lang,
                  "Não foi possível adicionar.",
                  "Could not add.",
                  "No se pudo añadir.",
                )}
              </p>
            )}
            {query.trim().length >= 2 ? (
              <div className="list-add-game-results" aria-busy={searching}>
                {searching && !results.length ? (
                  <p className="list-add-game-status">
                    <LoaderCircle className="spin" size={14} aria-hidden />
                    {tri(lang, "Buscando…", "Searching…", "Buscando…")}
                  </p>
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
                            ? tri(lang, "Na lista", "In list", "En la lista")
                            : tri(lang, "Adicionar", "Add", "Añadir")}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p>
                    {tri(
                      lang,
                      "Nenhum jogo encontrado.",
                      "No games found.",
                      "No se encontraron juegos.",
                    )}
                  </p>
                )}
              </div>
            ) : (
              <p className="list-add-game-empty">
                {tri(
                  lang,
                  "Digite ao menos duas letras para buscar no catálogo.",
                  "Type at least two letters to search the catalog.",
                  "Escribe al menos dos letras para buscar en el catálogo.",
                )}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
