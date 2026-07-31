"use client";

import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_IMAGE_SOURCE_BYTES,
  prepareImageUpload,
} from "@/lib/prepare-image-upload";
import { JOURNAL_IMAGE_LIMIT } from "@/lib/journal-entry";
import { tri, type UiLang } from "@/lib/ui-text";

type Draft =
  | { kind: "saved"; key: string; id: string; url: string }
  | { kind: "pending"; key: string; file: File; url: string };

export type JournalImageDraft = ReturnType<typeof useJournalImages>;

/**
 * Ordered images for one journal entry.
 *
 * The gallery is edited before the entry necessarily exists — a brand new
 * session has no id until it is saved — so picks are held locally and only
 * flushed by `commit`, which runs deletes, then uploads in display order, then
 * one reorder call. That last call is what makes the chosen order survive:
 * upload order alone would drift whenever a saved image moved.
 */
export function useJournalImages(entryId: string | null) {
  const [items, setItems] = useState<Draft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(entryId));
  const [error, setError] = useState<"load" | "size" | "upload" | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // `entryId` is fixed for the hook's lifetime — the editor is remounted by key
  // when it switches entries — so a null id simply never starts loading.
  useEffect(() => {
    if (!entryId) return;
    const controller = new AbortController();
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/journal/images?entry=${encodeURIComponent(entryId)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("load_failed");
        const payload = (await response.json()) as {
          images?: Array<{ id: string; url: string }>;
        };
        if (!active) return;
        setItems(
          (payload.images ?? []).map((image) => ({
            kind: "saved" as const,
            key: image.id,
            id: image.id,
            url: image.url,
          })),
        );
        setLoading(false);
      } catch (reason) {
        if ((reason as Error).name === "AbortError" || !active) return;
        setError("load");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [entryId]);

  function add(files: File[]) {
    setError(null);
    const room = JOURNAL_IMAGE_LIMIT - items.length;
    if (room <= 0) return;
    const accepted: Draft[] = [];
    for (const file of files.slice(0, room)) {
      if (file.size > MAX_IMAGE_SOURCE_BYTES) {
        setError("size");
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      accepted.push({
        kind: "pending",
        key: `${file.name}-${file.lastModified}-${objectUrls.current.length}`,
        file,
        url,
      });
    }
    if (accepted.length) setItems((current) => [...current, ...accepted]);
  }

  function remove(key: string) {
    setItems((current) => {
      const target = current.find((item) => item.key === key);
      if (target?.kind === "saved")
        setRemoved((ids) => [...ids, (target as { id: string }).id]);
      return current.filter((item) => item.key !== key);
    });
  }

  function move(key: string, delta: -1 | 1) {
    setItems((current) => {
      const index = current.findIndex((item) => item.key === key);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
      return reordered;
    });
  }

  /** Returns false when anything failed; the caller keeps the editor open. */
  async function commit(targetEntryId: string) {
    if (!items.length && !removed.length) return true;
    setError(null);
    for (const id of removed) {
      const response = await fetch(
        `/api/journal/images?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok && response.status !== 404) {
        setError("upload");
        return false;
      }
    }
    const orderedIds: string[] = [];
    for (const item of items) {
      if (item.kind === "saved") {
        orderedIds.push(item.id);
        continue;
      }
      const body = new FormData();
      body.set("entryId", targetEntryId);
      try {
        body.set(
          "image",
          await prepareImageUpload(item.file, { name: "journal.webp" }),
        );
      } catch {
        setError("upload");
        return false;
      }
      const response = await fetch("/api/journal/images", {
        method: "POST",
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        id?: string;
      } | null;
      if (!response.ok || !payload?.id) {
        setError("upload");
        return false;
      }
      orderedIds.push(payload.id);
    }
    setRemoved([]);
    if (orderedIds.length > 1) {
      const { error: rpcError } = await createClient().rpc(
        "reorder_diary_entry_images",
        { target_entry: targetEntryId, image_ids: orderedIds },
      );
      if (rpcError) {
        setError("upload");
        return false;
      }
    }
    return true;
  }

  return { items, loading, error, add, remove, move, commit };
}

export function JournalImageEditor({
  state,
  lang,
  disabled = false,
}: {
  state: JournalImageDraft;
  lang: UiLang;
  disabled?: boolean;
}) {
  const { items, loading, error, add, remove, move } = state;
  const full = items.length >= JOURNAL_IMAGE_LIMIT;
  return (
    <section className="journal-images">
      <header>
        <span>{tri(lang, "Imagens", "Images", "Imágenes")}</span>
        <small>
          {tri(
            lang,
            `${items.length} de ${JOURNAL_IMAGE_LIMIT} · arraste a ordem com as setas`,
            `${items.length} of ${JOURNAL_IMAGE_LIMIT} · order them with the arrows`,
            `${items.length} de ${JOURNAL_IMAGE_LIMIT} · ordénalas con las flechas`,
          )}
        </small>
      </header>
      {loading ? (
        <p className="journal-images-status">
          <LoaderCircle className="spin" size={15} aria-hidden />
          {tri(
            lang,
            "Carregando imagens…",
            "Loading images…",
            "Cargando imágenes…",
          )}
        </p>
      ) : (
        <ol className="journal-images-grid">
          {items.map((item, index) => (
            <li key={item.key}>
              {/* Both saved and picked images are blob/signed URLs the Next
                  optimizer cannot fetch. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" />
              <b aria-hidden>{index + 1}</b>
              <div className="journal-image-tools">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => move(item.key, -1)}
                  aria-label={tri(
                    lang,
                    `Mover imagem ${index + 1} para trás`,
                    `Move image ${index + 1} earlier`,
                    `Mover imagen ${index + 1} antes`,
                  )}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => move(item.key, 1)}
                  aria-label={tri(
                    lang,
                    `Mover imagem ${index + 1} para frente`,
                    `Move image ${index + 1} later`,
                    `Mover imagen ${index + 1} después`,
                  )}
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  type="button"
                  data-remove
                  disabled={disabled}
                  onClick={() => remove(item.key)}
                  aria-label={tri(
                    lang,
                    `Remover imagem ${index + 1}`,
                    `Remove image ${index + 1}`,
                    `Quitar imagen ${index + 1}`,
                  )}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
          {!full && (
            <li className="journal-image-add">
              <label>
                <ImagePlus size={20} />
                <span>
                  {tri(lang, "Adicionar", "Add images", "Añadir imágenes")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={disabled}
                  onChange={(event) => {
                    add(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />
              </label>
            </li>
          )}
        </ol>
      )}
      {error && (
        <p className="social-form-error" role="alert">
          {error === "size"
            ? tri(
                lang,
                "Alguma imagem passou de 12 MB e foi ignorada.",
                "An image was over 12 MB and was skipped.",
                "Una imagen superó los 12 MB y se omitió.",
              )
            : error === "load"
              ? tri(
                  lang,
                  "Não foi possível carregar as imagens desta sessão.",
                  "Could not load this session's images.",
                  "No se pudieron cargar las imágenes de esta sesión.",
                )
              : tri(
                  lang,
                  "Não foi possível enviar as imagens.",
                  "Could not upload the images.",
                  "No se pudieron subir las imágenes.",
                )}
        </p>
      )}
    </section>
  );
}
