"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  };
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const disarmTimer = useRef<number | null>(null);
  const [visibility, setVisibility] = useState(list.visibility);
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () => () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    },
    [],
  );
  async function update(formData: FormData) {
    setPending(true);
    setError(null);
    const { error: actionError } = await createClient().rpc(
      "update_game_list",
      {
        target_list: list.id,
        list_name: formData.get("name"),
        list_description: formData.get("description"),
        list_visibility: visibility,
      },
    );
    if (actionError)
      setError(
        tri(
          lang,
          "Não foi possível atualizar a lista.",
          "Could not update the list.",
          "No se pudo actualizar la lista.",
        ),
      );
    else {
      setOpen(false);
      router.refresh();
    }
    setPending(false);
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
          <Pencil size={14} /> {t.edit}
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
          <Dialog.Content
            className="social-editor-dialog"
            aria-describedby={undefined}
          >
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
                    "Editar detalhes",
                    "Edit details",
                    "Editar detalles",
                  )}
                </Dialog.Title>
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
                <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                <button type="submit" disabled={pending}>
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
