"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  id: string;
  kind: "review" | "diary";
  lang: "pt-BR" | "en";
  gameSlug: string;
  playedOn?: string;
  minutes?: number | null;
  content?: string | null;
  spoilers: boolean;
  visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE";
};

export function ActivityEntryActions(props: Props) {
  const { id, kind, lang } = props;
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    if (
      pending ||
      !window.confirm(pt ? "Remover este registro?" : "Remove this entry?")
    )
      return;
    setPending(true);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      kind === "review" ? "delete_review" : "delete_diary_entry",
      kind === "review" ? { review_id: id } : { entry_id: id },
    );
    if (actionError || data !== true) {
      setError(pt ? "Não foi possível remover." : "Could not remove.");
      setPending(false);
      return;
    }
    router.refresh();
  }
  async function update(formData: FormData) {
    setPending(true);
    setError(null);
    const minutes = String(formData.get("minutes") ?? "");
    const { error: actionError } = await createClient().rpc(
      "update_diary_entry",
      {
        entry_id: id,
        entry_date: formData.get("playedOn"),
        entry_minutes: minutes ? Number(minutes) : null,
        entry_note: formData.get("note"),
        spoilers: formData.get("spoilers") === "on",
        entry_visibility: formData.get("visibility"),
      },
    );
    if (actionError)
      setError(
        pt
          ? "Não foi possível atualizar a sessão."
          : "Could not update the session.",
      );
    else {
      setEditing(false);
      router.refresh();
    }
    setPending(false);
  }
  return (
    <>
      <div className="activity-entry-actions">
        {kind === "review" ? (
          <Link href={`/${lang}/game/${props.gameSlug}`}>
            <Pencil size={14} /> {pt ? "Editar" : "Edit"}
          </Link>
        ) : (
          <button type="button" onClick={() => setEditing(true)}>
            <Pencil size={14} /> {pt ? "Editar" : "Edit"}
          </button>
        )}
        <button type="button" onClick={remove} disabled={pending}>
          <Trash2 size={14} />{" "}
          {pending
            ? pt
              ? "Removendo…"
              : "Removing…"
            : pt
              ? "Remover"
              : "Remove"}
        </button>
        {error && <span role="alert">{error}</span>}
      </div>
      {kind === "diary" && (
        <Dialog.Root open={editing} onOpenChange={setEditing}>
          <Dialog.Portal>
            <Dialog.Overlay className="drawer-backdrop" />
            <Dialog.Content
              className="social-editor-dialog"
              aria-describedby={undefined}
            >
              <header>
                <div>
                  <span>{pt ? "DIÁRIO" : "DIARY"}</span>
                  <Dialog.Title>
                    {pt ? "Editar sessão" : "Edit session"}
                  </Dialog.Title>
                </div>
                <Dialog.Close aria-label={pt ? "Fechar" : "Close"}>
                  <X size={19} />
                </Dialog.Close>
              </header>
              <form action={update} className="social-editor-form">
                <div className="social-form-row">
                  <label>
                    <span>{pt ? "Data" : "Date"}</span>
                    <input
                      name="playedOn"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      defaultValue={props.playedOn}
                      required
                    />
                  </label>
                  <label>
                    <span>{pt ? "Minutos" : "Minutes"}</span>
                    <input
                      name="minutes"
                      type="number"
                      min={0}
                      max={100000}
                      defaultValue={props.minutes ?? ""}
                    />
                  </label>
                </div>
                <label>
                  <span>{pt ? "Nota da sessão" : "Session note"}</span>
                  <textarea
                    name="note"
                    maxLength={1000}
                    rows={6}
                    defaultValue={props.content ?? ""}
                  />
                </label>
                <div className="social-form-row social-form-options">
                  <label>
                    <span>{pt ? "Visibilidade" : "Visibility"}</span>
                    <select name="visibility" defaultValue={props.visibility}>
                      <option value="PUBLIC">
                        {pt ? "Público" : "Public"}
                      </option>
                      <option value="FOLLOWERS">
                        {pt ? "Seguidores" : "Followers"}
                      </option>
                      <option value="PRIVATE">
                        {pt ? "Privado" : "Private"}
                      </option>
                    </select>
                  </label>
                  <label className="social-check">
                    <input
                      type="checkbox"
                      name="spoilers"
                      defaultChecked={props.spoilers}
                    />
                    <span>{pt ? "Contém spoilers" : "Contains spoilers"}</span>
                  </label>
                </div>
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
      )}
    </>
  );
}
