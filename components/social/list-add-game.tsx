"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LibraryGame } from "@/lib/library-pool";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Adds games to a collection or ranking.
 *
 * The library comes down with the page and filters in memory, because that is
 * where most additions come from and a few hundred rows do not need a request
 * per keystroke. The catalogue is searched only once somebody types, and only
 * for what the library did not already answer.
 *
 * Restricting this to the library was deliberate once, to match the tierlist
 * beside it. The restriction turned out to be the wrong half to keep: people
 * make lists of games they have not played, and both surfaces now reach the
 * whole catalogue rather than both being narrow.
 */
type CatalogGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string | null;
};

export function ListAddGame({
  listId,
  pool,
  inListIds,
  lang,
}: {
  listId: string;
  pool: LibraryGame[];
  inListIds: number[];
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const ticket = ++requestId.current;
    const timer = setTimeout(() => {
      setSearching(true);
      void fetch(`/api/igdb/search?q=${encodeURIComponent(term)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { results?: unknown[] } | null) => {
          if (ticket !== requestId.current) return;
          const rows = Array.isArray(payload?.results) ? payload.results : [];
          setCatalog(
            rows.flatMap((row) => {
              const game = row as Record<string, unknown>;
              return typeof game.id === "number" &&
                typeof game.name === "string" &&
                typeof game.slug === "string"
                ? [
                    {
                      igdbId: game.id,
                      name: game.name,
                      slug: game.slug,
                      coverUrl:
                        typeof game.coverUrl === "string"
                          ? game.coverUrl
                          : null,
                    },
                  ]
                : [];
            }),
          );
        })
        .catch(() => {
          if (ticket === requestId.current) setCatalog([]);
        })
        .finally(() => {
          if (ticket === requestId.current) setSearching(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pool;
    return pool.filter((game) => game.name.toLowerCase().includes(normalized));
  }, [pool, query]);

  const shortTerm = query.trim().length < 2;
  const catalogMatches = useMemo(() => {
    if (shortTerm) return [];
    const known = new Set([
      ...pool.map((game) => game.igdbId),
      ...inListIds,
      ...added,
    ]);
    return catalog.filter((game) => !known.has(game.igdbId));
  }, [catalog, pool, inListIds, added, shortTerm]);

  async function add(game: CatalogGame | LibraryGame) {
    if (addingId !== null) return;
    setAddingId(game.igdbId);
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "add_game_to_list",
      {
        target_list: listId,
        game_id: game.igdbId,
        game_slug: game.slug,
      },
    );
    if (actionError) setError(true);
    else {
      setAdded((current) => [...current, game.igdbId]);
      router.refresh();
    }
    setAddingId(null);
  }

  // Only what was added in this session: the server-supplied pool already
  // excludes whatever was in the list when the page rendered, and the refresh
  // that would rebuild it has not landed yet.
  const inList = new Set(added);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
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
                {tri(lang, "Adicionar jogos", "Add games", "Añadir juegos")}
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tri(
                  lang,
                  "Buscar jogos",
                  "Search games",
                  "Buscar juegos",
                )}
                aria-label={tri(
                  lang,
                  "Buscar jogos para adicionar",
                  "Search games to add",
                  "Buscar juegos para añadir",
                )}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
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
            <div className="list-add-game-results">
              {matches.map((game) => (
                <GameRow
                  key={`library-${game.igdbId}`}
                  game={game}
                  already={inList.has(game.igdbId)}
                  busy={addingId}
                  onAdd={add}
                  lang={lang}
                />
              ))}
              {catalogMatches.length > 0 && (
                <p className="list-add-game-section">
                  {tri(lang, "Do catálogo", "From the catalog", "Del catálogo")}
                </p>
              )}
              {catalogMatches.map((game) => (
                <GameRow
                  key={`catalog-${game.igdbId}`}
                  game={game}
                  already={inList.has(game.igdbId)}
                  busy={addingId}
                  onAdd={add}
                  lang={lang}
                />
              ))}
              {searching && !shortTerm && (
                <p className="list-add-game-status">
                  <LoaderCircle className="spin" size={13} aria-hidden />
                  {tri(lang, "Buscando…", "Searching…", "Buscando…")}
                </p>
              )}
              {(!searching || shortTerm) &&
                !matches.length &&
                !catalogMatches.length && (
                  <p className="list-add-game-status">
                    {shortTerm
                      ? tri(
                          lang,
                          "Digite para buscar em todo o catálogo.",
                          "Type to search the whole catalog.",
                          "Escribe para buscar en todo el catálogo.",
                        )
                      : tri(
                          lang,
                          "Nenhum jogo encontrado.",
                          "No game found.",
                          "Ningún juego encontrado.",
                        )}
                  </p>
                )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function GameRow({
  game,
  already,
  busy,
  onAdd,
  lang,
}: {
  game: CatalogGame | LibraryGame;
  already: boolean;
  busy: number | null;
  onAdd: (game: CatalogGame | LibraryGame) => void;
  lang: UiLang;
}) {
  return (
    <div className="list-add-game-row">
      <span className="list-add-game-cover">
        {game.coverUrl && (
          <Image src={game.coverUrl} alt="" fill sizes="40px" unoptimized />
        )}
      </span>
      <span className="list-add-game-copy">
        <strong>{game.name}</strong>
      </span>
      <button
        type="button"
        disabled={already || busy !== null}
        onClick={() => onAdd(game)}
      >
        {busy === game.igdbId ? (
          <LoaderCircle className="spin" size={13} aria-hidden />
        ) : (
          <Plus size={13} />
        )}
        {already
          ? tri(lang, "Na lista", "In list", "En la lista")
          : tri(lang, "Adicionar", "Add", "Añadir")}
      </button>
    </div>
  );
}
