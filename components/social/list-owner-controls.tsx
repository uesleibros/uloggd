"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EditorVisibilitySelect } from "./review-studio-form";

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
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
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
        pt
          ? "Não foi possível atualizar a lista."
          : "Could not update the list.",
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
        pt ? "Não foi possível excluir a lista." : "Could not delete the list.",
      );
      setPending(false);
    } else router.push(`/${lang}/lists`);
  }
  return (
    <>
      <div className="list-owner-actions">
        <button type="button" onClick={() => setOpen(true)}>
          <Pencil size={14} /> {pt ? "Editar" : "Edit"}
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
            ? pt
              ? "Excluindo…"
              : "Deleting…"
            : armed
              ? pt
                ? "Confirmar exclusão?"
                : "Confirm deletion?"
              : pt
                ? "Excluir"
                : "Delete"}
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
                <span>{pt ? "GERENCIAR LISTA" : "MANAGE LIST"}</span>
                <Dialog.Title>
                  {pt ? "Editar detalhes" : "Edit details"}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                <X size={19} />
              </Dialog.Close>
            </header>
            <form action={update} className="social-editor-form">
              <label>
                <span>{pt ? "Nome" : "Name"}</span>
                <input
                  name="name"
                  defaultValue={list.name}
                  required
                  maxLength={100}
                />
              </label>
              <label>
                <span>{pt ? "Descrição" : "Description"}</span>
                <textarea
                  name="description"
                  defaultValue={list.description ?? ""}
                  maxLength={500}
                  rows={5}
                />
              </label>
              <label>
                <span>{pt ? "Visibilidade" : "Visibility"}</span>
                <EditorVisibilitySelect
                  value={visibility}
                  onChange={setVisibility}
                  pt={pt}
                />
              </label>
              {error && (
                <p className="social-form-error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <Dialog.Close type="button">
                  {pt ? "Cancelar" : "Cancel"}
                </Dialog.Close>
                <button type="submit" disabled={pending}>
                  {pending && (
                    <LoaderCircle className="spin" size={15} aria-hidden />
                  )}
                  {pending
                    ? pt
                      ? "Salvando…"
                      : "Saving…"
                    : pt
                      ? "Salvar"
                      : "Save"}
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
  lang: "pt-BR" | "en";
}) {
  const pt = lang === "pt-BR";
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
        {pending
          ? pt
            ? "Removendo…"
            : "Removing…"
          : pt
            ? "Remover"
            : "Remove"}
      </button>
      {error && <span role="alert">{pt ? "Falhou" : "Failed"}</span>}
    </div>
  );
}
