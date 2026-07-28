"use client";

import * as Dialog from "@/components/ui/dialog";
import { Check, Images, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveGameCover } from "@/lib/game-cover";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Cover = {
  url: string;
  source: "default" | "localized" | "edition";
};

export function CoverSelector({
  game,
  covers,
  savedCover,
  lang,
  enabled,
}: {
  game: { id: number; slug: string; coverUrl: string; name: string };
  covers: Cover[];
  savedCover: string | null;
  lang: UiLang;
  enabled: boolean;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const router = useRouter();
  const fallback = covers[0]?.url ?? game.coverUrl;
  const initial = resolveGameCover(fallback, savedCover);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels = pt
    ? { default: "Padrão", localized: "Localizada", edition: "Edição" }
    : { default: "Default", localized: "Localized", edition: "Edition" };

  function close() {
    if (pending) return;
    setSelected(saved);
    setError(null);
    setOpen(false);
  }

  async function save() {
    if (!enabled) {
      setError(
        tri(
          lang,
          "Entre para salvar uma capa.",
          "Sign in to save a cover.",
          "Inicia sesión para guardar una portada.",
        ),
      );
      return;
    }
    if (!selected || pending) return;
    setPending(true);
    setError(null);
    const { error: saveError } = await createClient().rpc(
      "set_game_custom_cover",
      { game_id: game.id, game_slug: game.slug, cover_url: selected },
    );
    if (saveError) {
      setError(
        tri(
          lang,
          "Não foi possível salvar a capa.",
          "Could not save the cover.",
          "No se pudo guardar la portada.",
        ),
      );
    } else {
      setSaved(selected);
      setOpen(false);
      window.dispatchEvent(
        new CustomEvent("uloggd:cover-changed", {
          detail: { gameId: game.id, coverUrl: selected },
        }),
      );
      router.refresh();
    }
    setPending(false);
  }

  return (
    <section className="game-cover-picker">
      <div className="game-cover-primary">
        {/* All options are trusted IGDB image URLs returned by the server. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={saved} alt={`${t.coverOf} ${game.name}`} />
      </div>
      {covers.length > 1 && (
        <button
          className="game-cover-change"
          type="button"
          onClick={() => {
            setSelected(saved);
            setOpen(true);
          }}
        >
          <Images size={14} />
          {tri(lang, "Alterar capa", "Change cover", "Cambiar portada")}
          <span>{covers.length}</span>
        </button>
      )}
      <Dialog.Root
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="cover-modal-backdrop" />
          <Dialog.Content className="cover-modal">
            <header>
              <div>
                <Dialog.Title>
                  {tri(lang, "Escolher capa", "Choose cover", "Elegir portada")}
                </Dialog.Title>
                <Dialog.Description>
                  {tri(
                    lang,
                    "Escolha como este jogo aparece na sua biblioteca.",
                    "Choose how this game appears across your library.",
                    "Elige cómo aparece este juego en tu biblioteca.",
                  )}
                </Dialog.Description>
              </div>
              <button type="button" onClick={close} aria-label={t.close}>
                <X size={19} />
              </button>
            </header>
            <div className="cover-modal-grid">
              {covers.map((cover) => (
                <button
                  key={cover.url}
                  type="button"
                  data-active={selected === cover.url || undefined}
                  onClick={() => setSelected(cover.url)}
                >
                  <span className="cover-modal-image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cover.url} alt="" />
                    {selected === cover.url && <Check size={16} />}
                  </span>
                  <strong>{labels[cover.source]}</strong>
                  {saved === cover.url && (
                    <small>{tri(lang, "Em uso", "In use", "En uso")}</small>
                  )}
                </button>
              ))}
            </div>
            {error && <p role="alert">{error}</p>}
            <footer>
              <button type="button" onClick={close} disabled={pending}>
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending || selected === saved}
              >
                {pending ? (
                  <LoaderCircle className="spin" size={14} />
                ) : (
                  <Check size={14} />
                )}
                {tri(lang, "Salvar capa", "Save cover", "Guardar portada")}
              </button>
            </footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
