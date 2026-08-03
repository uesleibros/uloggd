"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  Check,
  CircleCheck,
  ListPlus,
  LoaderCircle,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export type GameListOption = {
  id: string;
  name: string;
  containsGame: boolean;
};

/**
 * The one add-to-list flow used by game pages and card quick actions.
 *
 * Lists and membership are loaded only when requested, so game pages and cover
 * grids do not query account data until the viewer opens this picker.
 */
export function AddGameToListDialog({
  game,
  lang,
  trigger,
  open,
  onOpenChange,
}: {
  game: { id: number; slug: string; name: string; releaseYear?: number | null };
  lang: UiLang;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const dialogOpen = open ?? internalOpen;
  const [availableLists, setAvailableLists] = useState<GameListOption[] | null>(
    null,
  );
  const [choice, setChoice] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const closeTimer = useRef<number | null>(null);

  function changeOpen(next: boolean) {
    if (pending) return;
    if (!next) {
      setQuery("");
      setError(null);
      setSuccess(null);
      if (loadError) {
        setAvailableLists(null);
        setLoadError(false);
      }
    }
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!dialogOpen || availableLists !== null) return;
    const controller = new AbortController();
    void fetch(`/api/lists/options?gameId=${game.id}`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("list_options_failed");
        return (await response.json()) as { lists?: GameListOption[] };
      })
      .then((payload) => {
        const next = Array.isArray(payload.lists) ? payload.lists : [];
        setAvailableLists(next);
        setChoice(
          (current) =>
            current || next.find((list) => !list.containsGame)?.id || "",
        );
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setLoadError(true);
        setAvailableLists([]);
      });
    return () => controller.abort();
  }, [availableLists, dialogOpen, game.id]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const filteredLists = (availableLists ?? []).filter((list) =>
    list.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !choice) return;
    setPending(true);
    setError(null);
    setSuccess(null);
    const { error: rpcError } = await createClient().rpc("add_game_to_list", {
      target_list: choice,
      game_id: game.id,
      game_slug: game.slug,
    });
    if (rpcError) {
      setError(
        tri(
          lang,
          "Não foi possível salvar. Confira os campos e tente novamente.",
          "Could not save. Check the fields and try again.",
          "No se pudo guardar. Revisa los campos e inténtalo de nuevo.",
        ),
      );
      setPending(false);
      return;
    }
    const nextChoice =
      availableLists?.find((list) => list.id !== choice && !list.containsGame)
        ?.id ?? "";
    setAvailableLists(
      (current) =>
        current?.map((list) =>
          list.id === choice ? { ...list, containsGame: true } : list,
        ) ?? null,
    );
    setChoice(nextChoice);
    setSuccess(
      tri(
        lang,
        "Adicionado à lista.",
        "Added to the list.",
        "Añadido a la lista.",
      ),
    );
    setPending(false);
    router.refresh();
    closeTimer.current = window.setTimeout(() => changeOpen(false), 420);
  }

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={changeOpen}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop game-list-dialog-backdrop" />
        <Dialog.Content
          className="social-editor-dialog game-list-dialog"
          aria-describedby={undefined}
        >
          <header>
            <div>
              <span>
                {tri(
                  lang,
                  "Adicionar à lista",
                  "Add to list",
                  "Añadir a la lista",
                )}
              </span>
              <Dialog.Title>{game.name}</Dialog.Title>
            </div>
            {game.releaseYear && <time>{game.releaseYear}</time>}
            <Dialog.Close aria-label={t.close} disabled={pending}>
              <X size={19} />
            </Dialog.Close>
          </header>
          <form className="social-editor-form" onSubmit={submit}>
            {availableLists === null ? (
              <div className="social-empty-inline" data-loading>
                <LoaderCircle className="spin" size={17} aria-hidden />
                {tri(
                  lang,
                  "Carregando listas…",
                  "Loading lists…",
                  "Cargando listas…",
                )}
              </div>
            ) : availableLists.length ? (
              <fieldset className="game-list-picker">
                <legend>{t.list}</legend>
                <label className="game-list-picker-search">
                  <Search size={14} aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={tri(
                      lang,
                      "Buscar nas suas listas…",
                      "Search your lists…",
                      "Buscar en tus listas…",
                    )}
                    aria-label={tri(
                      lang,
                      "Buscar lista",
                      "Search lists",
                      "Buscar lista",
                    )}
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      aria-label={t.clear}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="game-list-picker-results">
                  {filteredLists.length ? (
                    filteredLists.map((list) => {
                      const selected = choice === list.id;
                      return (
                        <button
                          type="button"
                          key={list.id}
                          data-active={selected || undefined}
                          data-member={list.containsGame || undefined}
                          aria-pressed={selected}
                          disabled={list.containsGame}
                          onClick={() => setChoice(list.id)}
                        >
                          {list.containsGame ? (
                            <CircleCheck size={16} aria-hidden />
                          ) : (
                            <ListPlus size={15} aria-hidden />
                          )}
                          <span>{list.name}</span>
                          {list.containsGame ? (
                            <small>
                              {tri(lang, "Já está", "Added", "Ya está")}
                            </small>
                          ) : (
                            selected && <Check size={14} aria-hidden />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p>
                      {tri(
                        lang,
                        "Nenhuma lista encontrada.",
                        "No lists found.",
                        "No se encontraron listas.",
                      )}
                    </p>
                  )}
                </div>
                <small>
                  {tri(
                    lang,
                    `${filteredLists.length} de ${availableLists.length} listas`,
                    `${filteredLists.length} of ${availableLists.length} lists`,
                    `${filteredLists.length} de ${availableLists.length} listas`,
                  )}
                </small>
              </fieldset>
            ) : (
              <p className="social-empty-inline">
                {loadError
                  ? tri(
                      lang,
                      "Não foi possível carregar suas listas.",
                      "Could not load your lists.",
                      "No se pudieron cargar tus listas.",
                    )
                  : tri(
                      lang,
                      "Crie uma lista primeiro na página de listas.",
                      "Create a list on the lists page first.",
                      "Crea antes una lista en la página de listas.",
                    )}
              </p>
            )}
            {error && (
              <p className="social-form-error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="social-form-success" role="status">
                {success}
              </p>
            )}
            <footer>
              <Dialog.Close type="button" disabled={pending}>
                {t.cancel}
              </Dialog.Close>
              <button
                type="submit"
                aria-busy={pending}
                data-loading={pending || undefined}
                disabled={pending || !choice}
              >
                {pending && (
                  <LoaderCircle className="spin" size={15} aria-hidden />
                )}
                {pending ? t.saving : t.save}
              </button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
