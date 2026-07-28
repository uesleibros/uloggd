"use client";

import * as Dialog from "@/components/ui/dialog";
import { ListOrdered, LoaderCircle, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { EditorVisibilitySelect } from "./review-studio-form";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

export function ListOwnerControls({
  list,
  lang,
}: {
  list: {
    id: string;
    name: string;
    description: string | null;
    visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
    ranked: boolean;
    kind?: "COLLECTION" | "TIERLIST";
  };
  lang: UiLang;
}) {
  const isTierlist = list.kind === "TIERLIST";
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<number | null>(null);
  const [visibility, setVisibility] = useState(list.visibility);
  const [ranked, setRanked] = useState(list.ranked);
  const [error, setError] = useState<string | null>(null);
  // router.refresh() is server work the RPC's own pending flag knows nothing
  // about. Without this the spinner stopped and the dialog closed while the
  // page was still showing the old name, which read as "nothing happened".
  const [refreshing, startRefresh] = useTransition();
  const busy = pending || refreshing;
  useEffect(
    () => () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    },
    [],
  );
  async function update(formData: FormData) {
    setPending(true);
    setError(null);
    const client = createClient();
    let droppedMode = false;
    let { error: actionError } = await client.rpc("update_game_list", {
      target_list: list.id,
      list_name: formData.get("name"),
      list_description: formData.get("description"),
      list_visibility: visibility,
      list_ranked: ranked,
    });
    if (
      actionError &&
      actionError.message.toLowerCase().includes("could not find the function")
    ) {
      // The database predates the ranked_lists migration. Everything else still
      // saves through the older signature — the format simply cannot.
      droppedMode = true;
      ({ error: actionError } = await client.rpc("update_game_list", {
        target_list: list.id,
        list_name: formData.get("name"),
        list_description: formData.get("description"),
        list_visibility: visibility,
      }));
    }
    if (actionError) {
      setError(
        tri(
          lang,
          "Não foi possível atualizar a lista.",
          "Could not update the list.",
          "No se pudo actualizar la lista.",
        ),
      );
      setPending(false);
      return;
    }
    // Closing on a half-applied save is how "salvei e não mudou nada" happens;
    // the dialog stays open to say which part did not land.
    const halfApplied = droppedMode && ranked !== list.ranked;
    if (halfApplied) {
      setError(
        tri(
          lang,
          "Nome, descrição e visibilidade foram salvos, mas o formato não: o banco ainda não tem a migração ranked_lists.",
          "Name, description, and visibility were saved, but the format was not: the database is missing the ranked_lists migration.",
          "Nombre, descripción y visibilidad se guardaron, pero el formato no: la base de datos no tiene la migración ranked_lists.",
        ),
      );
    }
    setPending(false);
    // Closing inside the transition means the dialog stays put, spinner and
    // all, until the refreshed page is ready behind it.
    startRefresh(() => {
      router.refresh();
      if (!halfApplied) setOpen(false);
    });
  }
  async function remove() {
    if (pending) return;
    if (!armed) {
      setArmed(true);
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
      disarmTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    setArmed(false);
    setPending(true);
    const { data, error: actionError } = await createClient().rpc(
      "delete_game_list",
      { target_list: list.id },
    );
    if (actionError || data !== true) {
      setError(
        tri(
          lang,
          "Não foi possível excluir a lista.",
          "Could not delete the list.",
          "No se pudo eliminar la lista.",
        ),
      );
      setPending(false);
    } else router.push(`/${lang}/lists`);
  }
  return (
    <>
      <div className="list-owner-actions">
        <button type="button" onClick={() => setOpen(true)}>
          <Settings2 size={14} />{" "}
          {tri(lang, "Configurações", "Settings", "Configuración")}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          data-armed={armed || undefined}
          aria-live="polite"
        >
          {pending ? (
            <LoaderCircle className="spin" size={14} aria-hidden />
          ) : (
            <Trash2 size={14} />
          )}{" "}
          {pending
            ? tri(lang, "Excluindo…", "Deleting…", "Eliminando…")
            : armed
              ? tri(
                  lang,
                  "Confirmar exclusão?",
                  "Confirm deletion?",
                  "¿Confirmar eliminación?",
                )
              : t.delete}
        </button>
      </div>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content className="social-editor-dialog">
            <header>
              <div>
                <span>
                  {tri(
                    lang,
                    "GERENCIAR LISTA",
                    "MANAGE LIST",
                    "GESTIONAR LISTA",
                  )}
                </span>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Configurações da lista",
                    "List settings",
                    "Configuración de la lista",
                  )}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Nome, descrição, formato e visibilidade.",
                    "Name, description, format, and visibility.",
                    "Nombre, descripción, formato y visibilidad.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={19} />
              </Dialog.Close>
            </header>
            <form action={update} className="social-editor-form">
              <label>
                <span>{tri(lang, "Nome", "Name", "Nombre")}</span>
                <input
                  name="name"
                  defaultValue={list.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                <span>
                  {tri(lang, "Descrição", "Description", "Descripción")}
                </span>
                <textarea
                  name="description"
                  defaultValue={list.description ?? ""}
                  maxLength={500}
                  rows={5}
                />
              </label>
              {/* A tierlist ranks through its tiers, so it never shows the
                  numbered-ranking switch. */}
              {!isTierlist && (
                <div className="create-list-rank-toggle">
                  <span>
                    <ListOrdered size={16} aria-hidden />
                    <span>
                      <strong>
                        {tri(lang, "Ranquear", "Rank", "Ranquear")}
                      </strong>
                      <small>
                        {tri(
                          lang,
                          "Numera do melhor ao pior; você define a posição.",
                          "Numbers from best to worst; you set the position.",
                          "Numera del mejor al peor; tú defines la posición.",
                        )}
                      </small>
                    </span>
                  </span>
                  <Switch
                    checked={ranked}
                    onCheckedChange={setRanked}
                    aria-label={tri(lang, "Ranquear", "Rank", "Ranquear")}
                  />
                </div>
              )}
              <label>
                <span>{t.visibility}</span>
                <EditorVisibilitySelect
                  value={visibility}
                  onChange={setVisibility}
                  lang={lang}
                />
              </label>
              {error && (
                <p className="social-form-error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <Dialog.Close type="button" disabled={busy}>
                  {t.cancel}
                </Dialog.Close>
                <button type="submit" disabled={busy}>
                  {busy && (
                    <LoaderCircle className="spin" size={15} aria-hidden />
                  )}
                  {busy ? t.saving : t.save}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function RemoveListItem({
  listId,
  gameId,
  lang,
}: {
  listId: string;
  gameId: number;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function remove() {
    if (pending) return;
    setPending(true);
    setError(false);
    const { data, error: actionError } = await createClient().rpc(
      "remove_game_from_list",
      { target_list: listId, game_id: gameId },
    );
    if (actionError || data !== true) {
      setError(true);
      setPending(false);
    } else router.refresh();
  }
  return (
    <div className="list-item-owner-action">
      <button type="button" onClick={remove} disabled={pending}>
        {pending ? (
          <LoaderCircle className="spin" size={13} aria-hidden />
        ) : (
          <X size={13} />
        )}{" "}
        {pending ? t.removing : t.remove}
      </button>
      {error && (
        <span role="alert">{tri(lang, "Falhou", "Failed", "Falló")}</span>
      )}
    </div>
  );
}
