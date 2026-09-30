"use client";

import * as Dialog from "@/components/ui/dialog";
import { SafeImage } from "@/components/safe-image";
import { LoadError } from "@/components/ui/load-error";
import { useCatalogSearch } from "@/lib/use-catalog-search";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { useMemo, useState } from "react";
import type { LibraryGame } from "@/lib/library-pool";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Adds games to a collection or ranking.
 *
 * Opening the dialog loads the library once, then filters it in memory.
 * Typing also searches the catalogue for games outside that library.
 */
type CatalogGame = {
  igdbId: number;
  slug: string;
  name: string;
  coverUrl: string;
  fallbackUrl: string;
};

export function ListAddGame({
  listId,
  inListIds,
  lang,
}: {
  listId: string;
  inListIds: number[];
  lang: UiLang;
}) {
  // The owner's library, asked for by this field when editing opens rather
  // than by the page on the server: it used to be why switching to editing
  // drew the whole page again. The catalogue search works while it loads.
  const [open, setOpen] = useState(false);
  const library = useApi<{ data: LibraryGame[] }>(
    open ? "/library/pool" : null,
  );
  const pool = useMemo(() => {
    const used = new Set(inListIds);
    return (library.payload?.data ?? []).filter(
      (game) => !used.has(game.igdbId),
    );
  }, [library.payload, inListIds]);
  const t = uiText(lang);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const catalogSearch = useCatalogSearch(query, open);
  const { results: catalog, loading: searching } = catalogSearch;

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
    try {
      await api.post(`/lists/${listId}/items`, {
        igdb_id: game.igdbId,
        game_slug: game.slug,
      });
      setAdded((current) => [...current, game.igdbId]);
      router.refresh();
    } catch {
      setError(true);
    }
    setAddingId(null);
  }

  // Only what was added in this session: the pool already leaves out what the
  // list held when the page drew it, and the refresh that would redraw the
  // list with the new game has not landed yet.
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
            {library.error != null && (
              <LoadError lang={lang} onRetry={library.reload} />
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
                  {t.searching}
                </p>
              )}
              {catalogSearch.error && (
                <LoadError lang={lang} onRetry={catalogSearch.reload} />
              )}
              {!catalogSearch.error &&
                library.error == null &&
                !library.loading &&
                (!searching || shortTerm) &&
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
          <SafeImage
            src={game.coverUrl}
            fallbackSrc={game.fallbackUrl}
            alt=""
            fill
            sizes="40px"
            unoptimized
          />
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
