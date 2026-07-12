"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function CoverSelector({
  game,
  covers,
  savedCover,
  lang,
  enabled,
}: {
  game: { id: number; slug: string };
  covers: string[];
  savedCover: string | null;
  lang: "pt-BR" | "en";
  enabled: boolean;
}) {
  const pt = lang === "pt-BR";
  const initial = savedCover ?? covers[0];
  const [selected, setSelected] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    if (!enabled || !selected || pending) return;
    setPending(true);
    setMessage(null);
    const { error } = await createClient().rpc("set_game_custom_cover", {
      game_id: game.id,
      game_slug: game.slug,
      cover_url: selected,
    });
    if (error) {
      setMessage(
        pt ? "Não foi possível salvar a capa." : "Could not save the cover.",
      );
    } else {
      setSaved(selected);
      setMessage(pt ? "Capa salva." : "Cover saved.");
    }
    setPending(false);
  }

  return (
    <section className="game-cover-picker">
      <div className="game-cover-primary">
        {/* All options are trusted IGDB image URLs returned by the server. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selected} alt="" />
      </div>
      {covers.length > 1 && (
        <div
          className="game-cover-options"
          aria-label={pt ? "Capas disponíveis" : "Available covers"}
        >
          {covers.map((cover) => (
            <button
              key={cover}
              type="button"
              data-active={selected === cover || undefined}
              onClick={() => setSelected(cover)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" />
              {saved === cover && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
      {enabled && selected !== saved && (
        <button
          className="game-cover-save"
          type="button"
          onClick={save}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="spin" size={14} />
          ) : (
            <Check size={14} />
          )}
          {pt ? "Usar esta capa" : "Use this cover"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
