"use client";

import * as Dialog from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronUp,
  FolderClosed,
  FolderOpen,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import type { ListFolder } from "@/lib/lists-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Folders, as a row of headings over somebody's own lists.
 *
 * Thirty lists is a grid you scroll and search. A hundred is a filing problem,
 * and the filters beside this cannot solve it: they ask what a list is, not
 * what it is for. "Series I am working through" and "recommendations" are the
 * owner's categories and nothing the site can infer.
 *
 * A folder is a heading and nothing more. It carries no visibility, so filing
 * a private list does not publish it, and deleting a folder does not delete
 * what was in it: those lists become unfiled, which is what tidying a shelf
 * means everywhere else.
 */
export function ListFoldersBar({
  lang,
  folders,
  active,
  unfiled,
  onPick,
}: {
  lang: UiLang;
  folders: ListFolder[];
  /** A folder id, "NONE" for the unfiled, or "" for all of them. */
  active: string;
  /** How many lists are in no folder, which decides whether that is a chip. */
  unfiled: number;
  onPick: (next: string) => void;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const oops = () =>
    setError(
      tri(
        lang,
        "Não deu para salvar agora.",
        "That could not be saved right now.",
        "No se pudo guardar ahora.",
      ),
    );

  async function run(work: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await work();
      router.refresh();
    } catch {
      oops();
    }
    setBusy(false);
  }

  /**
   * Swaps a folder with its neighbour.
   *
   * Two writes rather than a drag: the order is a number on the row, and a
   * pair of arrows says what it does without a pointer gesture nobody can
   * discover. The whole list is renumbered from zero so a shelf that was
   * never ordered does not start at whatever the rows happened to hold.
   */
  const move = (index: number, by: -1 | 1) => {
    const next = index + by;
    if (next < 0 || next >= folders.length) return;
    const order = [...folders];
    [order[index], order[next]] = [order[next], order[index]];
    void run(async () => {
      for (let at = 0; at < order.length; at += 1)
        if (order[at].position !== at)
          await api.patch(`/lists/folders/${order[at].public_id}`, {
            position: at,
          });
    });
  };

  const create = () => {
    const wanted = name.trim();
    if (!wanted) return;
    void run(async () => {
      await api.post("/lists/folders", { name: wanted });
      setName("");
    });
  };

  return (
    <div className="list-folders">
      <div className="list-folders-chips" role="group">
        <button
          type="button"
          data-active={!active || undefined}
          onClick={() => onPick("")}
        >
          {t.allFeminine}
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            data-active={active === folder.public_id || undefined}
            onClick={() =>
              onPick(active === folder.public_id ? "" : folder.public_id)
            }
          >
            {active === folder.id ? (
              <FolderOpen size={13} aria-hidden />
            ) : (
              <FolderClosed size={13} aria-hidden />
            )}
            {folder.name}
            <strong>{folder.lists}</strong>
          </button>
        ))}
        {/* Only worth offering once there is something on both sides of the
            line: with no folders, "the ones in no folder" is every list there
            is, and with nothing unfiled it is an empty shelf. It stays while
            it is the chosen one, so there is always a way back out. */}
        {folders.length > 0 && (unfiled > 0 || active === "NONE") && (
          <button
            type="button"
            data-active={active === "NONE" || undefined}
            onClick={() => onPick(active === "NONE" ? "" : "NONE")}
          >
            {tri(lang, "Sem pasta", "Unfiled", "Sin carpeta")}
          </button>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger className="list-folders-manage">
          <FolderClosed size={13} aria-hidden />
          {t.folders}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content className="social-editor-dialog list-folders-dialog">
            <header>
              <div>
                <Dialog.Title>
                  {t.folders}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Só suas: uma pasta é um título sobre suas listas, e não muda quem vê o quê. Apagar uma pasta não apaga as listas dentro dela.",
                    "Yours alone: a folder is a heading over your lists, and it changes nothing about who sees what. Deleting one does not delete the lists in it.",
                    "Solo tuyas: una carpeta es un título sobre tus listas y no cambia quién ve qué. Borrar una no borra las listas que hay dentro.",
                  )}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={19} />
              </Dialog.Close>
            </header>

            <ul className="list-folders-rows">
              {folders.map((folder, index) => (
                <li key={folder.id}>
                  {editing === folder.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const wanted = draft.trim();
                        if (!wanted) return;
                        void run(async () => {
                          await api.patch(`/lists/folders/${folder.id}`, {
                            name: wanted,
                          });
                          setEditing(null);
                        });
                      }}
                    >
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        maxLength={60}
                        autoFocus
                        aria-label={t.name}
                      />
                      <button type="submit" disabled={busy}>
                        {t.save}
                      </button>
                      <button type="button" onClick={() => setEditing(null)}>
                        {t.cancel}
                      </button>
                    </form>
                  ) : (
                    <>
                      <span>
                        {folder.name}
                        <small>
                          {tri(
                            lang,
                            `${folder.lists} ${folder.lists === 1 ? "lista" : "listas"}`,
                            `${folder.lists} ${folder.lists === 1 ? "list" : "lists"}`,
                            `${folder.lists} ${folder.lists === 1 ? "lista" : "listas"}`,
                          )}
                        </small>
                      </span>
                      {/* The owner's own order, which is what anybody means
                          by their shelves. Alphabetical is not it. */}
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={tri(lang, "Subir", "Move up", "Subir")}
                        onClick={() => void move(index, -1)}
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={index === folders.length - 1}
                        aria-label={tri(lang, "Descer", "Move down", "Bajar")}
                        onClick={() => void move(index, 1)}
                      >
                        <ChevronDown size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={tri(
                          lang,
                          "Renomear",
                          "Rename",
                          "Renombrar",
                        )}
                        onClick={() => {
                          setEditing(folder.id);
                          setDraft(folder.name);
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={tri(lang, "Apagar", "Delete", "Borrar")}
                        onClick={() =>
                          void run(() =>
                            api.delete(`/lists/folders/${folder.id}`),
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </li>
              ))}
              {!folders.length && (
                <li className="list-folders-none">
                  {tri(
                    lang,
                    "Nenhuma pasta ainda.",
                    "No folders yet.",
                    "Todavía sin carpetas.",
                  )}
                </li>
              )}
            </ul>

            <form
              className="list-folders-new"
              onSubmit={(event) => {
                event.preventDefault();
                create();
              }}
            >
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={60}
                placeholder={tri(
                  lang,
                  "Nome da pasta",
                  "Folder name",
                  "Nombre de la carpeta",
                )}
                aria-label={tri(
                  lang,
                  "Nome da nova pasta",
                  "New folder name",
                  "Nombre de la nueva carpeta",
                )}
              />
              <button type="submit" disabled={busy || !name.trim()}>
                {busy ? (
                  <LoaderCircle className="spin" size={14} aria-hidden />
                ) : (
                  <Plus size={14} aria-hidden />
                )}
                {t.create}
              </button>
            </form>
            {error && (
              <p className="list-folders-error" role="alert">
                {error}
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
