"use client";

import * as Dialog from "@/components/ui/dialog";
import Image from "next/image";
import { LibraryBig, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LibraryGame } from "@/lib/library-pool";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Adds games to a collection or ranking, from the owner's own library.
 *
 * This used to search the whole IGDB catalogue, which meant a list could hold
 * games its owner had never logged, and it behaved nothing like the tierlist
 * beside it, where games are dragged out of the library. One way in for both
 * now: a list is a statement about games you have.
 *
 * The pool arrives from the server already filtered to what is not in the
 * list, so filtering is a substring match over something already in memory. A
 * library runs to a few hundred rows at most, well under what a debounce and a
 * request per keystroke would be worth.
 */
export function ListAddGame({
  listId,
  pool,
  lang,
}: {
  listId: string;
  pool: LibraryGame[];
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const [added, setAdded] = useState<number[]>([]);
  const [error, setError] = useState(false);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return pool;
    return pool.filter((game) => game.name.toLowerCase().includes(normalized));
  }, [pool, query]);

  async function add(game: LibraryGame) {
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
                {tri(
                  lang,
                  "Adicionar da sua biblioteca",
                  "Add from your library",
                  "Añadir desde tu biblioteca",
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tri(lang, "Filtrar", "Filter", "Filtrar")}
                aria-label={tri(
                  lang,
                  "Filtrar jogos da biblioteca",
                  "Filter library games",
                  "Filtrar juegos de la biblioteca",
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
            {!pool.length ? (
              // Deliberately distinct from "nothing matched": one is answered
              // by typing less, the other by logging a game.
              <p className="list-add-game-empty">
                <LibraryBig size={15} aria-hidden />
                {tri(
                  lang,
                  "Todos os jogos da sua biblioteca já estão nesta lista.",
                  "Every game in your library is already in this list.",
                  "Todos los juegos de tu biblioteca ya están en esta lista.",
                )}
              </p>
            ) : (
              <div className="list-add-game-results">
                {matches.length ? (
                  matches.map((game) => {
                    const already = inList.has(game.igdbId);
                    return (
                      <div className="list-add-game-row" key={game.igdbId}>
                        <span className="list-add-game-cover">
                          {game.coverUrl && (
                            <Image
                              src={game.coverUrl}
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
                          disabled={already || addingId !== null}
                          onClick={() => add(game)}
                        >
                          {addingId === game.igdbId ? (
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
                  <p className="list-add-game-status">
                    {tri(
                      lang,
                      "Nenhum jogo da sua biblioteca corresponde.",
                      "No game in your library matches.",
                      "Ningún juego de tu biblioteca coincide.",
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
