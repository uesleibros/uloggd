"use client";

import { api, settle } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { LoadError } from "@/components/ui/load-error";

import Image from "next/image";
import { useState } from "react";
import { History, LoaderCircle, X } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * The last few avatars or banners, so switching back is one tap.
 *
 * Changing a profile picture used to destroy the old one, and people swap them
 * for a season or a joke and want the previous one back. Five slots is enough
 * for "the one before this" and "the one I actually like" without becoming an
 * archive nobody curates.
 *
 * Private to its owner. These are pictures someone chose to stop showing, and
 * the list of them is a record of how they have presented themselves over time.
 */
type Slot = {
  id: string;
  image_url: string;
  created_at: string;
};

export function ProfileImageHistory({
  kind,
  current,
  onSelect,
  lang,
}: {
  kind: "AVATAR" | "BANNER";
  current: string | null;
  /** Applies a slot. The parent owns the write, since it owns the form. */
  onSelect: (url: string) => Promise<void> | void;
  lang: UiLang;
}) {
  const read = useApi<{ data: Slot[] }>(`/profile/images?kind=${kind}`, {
    keepPrevious: true,
  });
  const slots = read.payload?.data ?? [];
  const [pending, setPending] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function apply(slot: Slot) {
    if (pending) return;
    setPending(slot.id);
    setFailed(false);
    try {
      await onSelect(slot.image_url);
      read.reload();
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  async function drop(slot: Slot) {
    if (pending) return;
    setPending(slot.id);
    const { error } = await settle(
      api.delete<{ data: unknown }>(`/profile/images/${slot.id}`),
    );
    setFailed(Boolean(error));
    if (!error) read.reload();
    setPending(null);
  }

  // The one on the profile right now is not offered as something to switch to.
  const offered = slots.filter((slot) => slot.image_url !== current);
  if (offered.length === 0 && !read.error && !failed) return null;

  return (
    <div className="image-history" data-kind={kind.toLowerCase()}>
      {read.error != null && (
        <LoadError
          lang={lang}
          onRetry={read.reload}
          what={tri(
            lang,
            "as imagens anteriores",
            "the previous images",
            "las imágenes anteriores",
          )}
        />
      )}
      {failed && (
        <p role="alert">
          {tri(
            lang,
            "Não foi possível atualizar esta imagem. Tente novamente.",
            "Could not update this image. Try again.",
            "No se pudo actualizar esta imagen. Intenta de nuevo.",
          )}
        </p>
      )}
      <span className="image-history-label">
        <History size={13} aria-hidden />
        {tri(lang, "Usadas antes", "Used before", "Usadas antes")}
      </span>
      <ul>
        {offered.map((slot) => (
          <li key={slot.id}>
            <button
              type="button"
              onClick={() => void apply(slot)}
              disabled={pending !== null}
              aria-label={tri(
                lang,
                "Usar esta imagem novamente",
                "Use this image again",
                "Usar esta imagen de nuevo",
              )}
            >
              {pending === slot.id ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Image
                  src={slot.image_url}
                  alt=""
                  fill
                  sizes="56px"
                  unoptimized
                />
              )}
            </button>
            <button
              type="button"
              className="image-history-drop"
              onClick={() => void drop(slot)}
              disabled={pending !== null}
              aria-label={tri(
                lang,
                "Esquecer esta imagem",
                "Forget this image",
                "Olvidar esta imagen",
              )}
            >
              <X size={11} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
