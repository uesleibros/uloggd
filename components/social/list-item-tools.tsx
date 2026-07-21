"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  LoaderCircle,
  StickyNote,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tooltip } from "@/components/ui/tooltip";
import { uiText, type UiLang } from "@/lib/ui-text";

export function ListItemTools({
  listId,
  itemId,
  note,
  first,
  last,
  lang,
}: {
  listId: string;
  itemId: string;
  note: string | null;
  first: boolean;
  last: boolean;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const [pending, setPending] = useState<"up" | "down" | "top" | "note" | null>(
    null,
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [error, setError] = useState(false);

  async function move(direction: "up" | "down" | "top") {
    if (pending) return;
    setPending(direction);
    setError(false);
    const { error: actionError } = await createClient().rpc("move_list_item", {
      target_list: listId,
      item_id: itemId,
      direction,
    });
    if (actionError) setError(true);
    else router.refresh();
    setPending(null);
  }

  async function saveNote(formData: FormData) {
    if (pending) return;
    setPending("note");
    setError(false);
    const { error: actionError } = await createClient().rpc(
      "set_list_item_note",
      {
        target_list: listId,
        item_id: itemId,
        item_note: String(formData.get("note") ?? ""),
      },
    );
    if (actionError) setError(true);
    else {
      setNoteOpen(false);
      router.refresh();
    }
    setPending(null);
  }

  return (
    <div className="list-item-tools">
      <Tooltip label={pt ? "Mover para o topo" : "Move to top"}>
        <button
          type="button"
          onClick={() => move("top")}
          disabled={Boolean(pending) || first}
          aria-label={pt ? "Mover para o topo" : "Move to top"}
        >
          {pending === "top" ? (
            <LoaderCircle className="spin" size={13} aria-hidden />
          ) : (
            <ArrowUpToLine size={13} />
          )}
        </button>
      </Tooltip>
      <button
        type="button"
        onClick={() => move("up")}
        disabled={Boolean(pending) || first}
        aria-label={pt ? "Mover para cima" : "Move up"}
      >
        {pending === "up" ? (
          <LoaderCircle className="spin" size={13} aria-hidden />
        ) : (
          <ArrowUp size={13} />
        )}
      </button>
      <button
        type="button"
        onClick={() => move("down")}
        disabled={Boolean(pending) || last}
        aria-label={pt ? "Mover para baixo" : "Move down"}
      >
        {pending === "down" ? (
          <LoaderCircle className="spin" size={13} aria-hidden />
        ) : (
          <ArrowDown size={13} />
        )}
      </button>
      <button
        type="button"
        data-has-note={Boolean(note) || undefined}
        onClick={() => setNoteOpen(true)}
        aria-label={pt ? "Editar nota" : "Edit note"}
      >
        <StickyNote size={13} />
      </button>
      {error && <span role="alert">{pt ? "Falhou" : "Failed"}</span>}
      <Dialog.Root open={noteOpen} onOpenChange={setNoteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <span>{pt ? "NOTA DO ITEM" : "ITEM NOTE"}</span>
                <Dialog.Title>
                  {pt
                    ? "Por que este jogo está aqui?"
                    : "Why is this game here?"}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={19} />
              </Dialog.Close>
            </header>
            <form action={saveNote} className="social-editor-form">
              <label>
                <span>{pt ? "Nota (opcional)" : "Note (optional)"}</span>
                <textarea
                  name="note"
                  maxLength={300}
                  rows={4}
                  defaultValue={note ?? ""}
                  placeholder={
                    pt
                      ? "Um comentário curto exibido junto ao jogo na lista."
                      : "A short comment shown with the game on the list."
                  }
                />
              </label>
              {error && (
                <p className="social-form-error" role="alert">
                  {pt
                    ? "Não foi possível salvar a nota."
                    : "Could not save the note."}
                </p>
              )}
              <footer>
                <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                <button type="submit" disabled={Boolean(pending)}>
                  {pending === "note" && (
                    <LoaderCircle className="spin" size={15} aria-hidden />
                  )}
                  {pending === "note" ? t.saving : t.save}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
