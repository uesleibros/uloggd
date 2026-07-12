"use client";

import { useState } from "react";
import { Check, ImagePlus, LoaderCircle, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Status =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
type State = {
  status: Status;
  quick_rating: number | null;
  custom_cover_url: string | null;
} | null;
export function QuickGameCard({
  game,
  initial,
  lang,
  rank,
  enabled = true,
}: {
  game: {
    id: number;
    slug: string;
    name: string;
    coverUrl: string;
    releaseYear: number | null;
    genres: string[];
  };
  initial: State;
  lang: "pt-BR" | "en";
  rank?: number;
  enabled?: boolean;
}) {
  const pt = lang === "pt-BR";
  const [state, setState] = useState<State>(initial);
  const [pending, setPending] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [cover, setCover] = useState(initial?.custom_cover_url ?? "");
  const [error, setError] = useState<string | null>(null);
  async function save(
    status: Status = state?.status ?? "BACKLOG",
    rating = state?.quick_rating ?? null,
    custom = cover || null,
  ) {
    if (
      rating !== null &&
      (!Number.isInteger(rating) || rating < 0 || rating > 100)
    ) {
      setError(
        pt
          ? "Use uma nota inteira entre 0 e 100."
          : "Use a whole rating from 0 to 100.",
      );
      return;
    }

    if (custom) {
      try {
        if (new URL(custom).protocol !== "https:") throw new Error();
      } catch {
        setError(
          pt
            ? "Use uma URL de imagem HTTPS válida."
            : "Use a valid HTTPS image URL.",
        );
        return;
      }
    }

    setPending(true);
    setError(null);
    const { data, error } = await createClient().rpc("set_game_quick_state", {
      game_id: game.id,
      game_slug: game.slug,
      game_status: status,
      rating,
      cover_url: custom,
    });
    if (error) {
      setError(pt ? "Não foi possível salvar." : "Could not save.");
      setPending(false);
      return;
    }
    setState(data as State);
    setEditingCover(false);
    setPending(false);
  }
  const image = state?.custom_cover_url || game.coverUrl;
  return (
    <article className="quick-game-card">
      <div className="quick-cover">
        {/* Custom covers can use any HTTPS image host and render directly in the browser. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`Capa de ${game.name}`} />
        {rank && (
          <span className="quick-rank">{String(rank).padStart(2, "0")}</span>
        )}
        {enabled && (
          <div className="quick-actions">
            <div className="quick-statuses">
              {(["WISHLIST", "PLAYING", "COMPLETED"] as Status[]).map(
                (status) => (
                  <button
                    key={status}
                    data-active={state?.status === status || undefined}
                    onClick={() => save(status)}
                    disabled={pending}
                  >
                    {status === "WISHLIST"
                      ? pt
                        ? "Quero"
                        : "Want"
                      : status === "PLAYING"
                        ? pt
                          ? "Jogando"
                          : "Playing"
                        : pt
                          ? "Zerei"
                          : "Done"}
                  </button>
                ),
              )}
            </div>
            <label className="quick-rating">
              <Star size={13} />
              <input
                aria-label={
                  pt ? "Nota de zero a cem" : "Rating from zero to one hundred"
                }
                type="number"
                min="0"
                max="100"
                step="1"
                value={state?.quick_rating ?? ""}
                placeholder="—"
                onChange={(event) => {
                  const value =
                    event.target.value === ""
                      ? null
                      : Number(event.target.value);
                  setState((current) => ({
                    status: current?.status ?? "BACKLOG",
                    quick_rating: value,
                    custom_cover_url: current?.custom_cover_url ?? null,
                  }));
                }}
                onBlur={() => save()}
              />
              <span>/100</span>
            </label>
            <button
              className="quick-cover-edit"
              onClick={() => setEditingCover((value) => !value)}
            >
              <ImagePlus size={14} />
              {pt ? "Trocar capa" : "Change cover"}
            </button>
            {editingCover && (
              <div className="quick-cover-form">
                <input
                  aria-label={pt ? "URL da nova capa" : "New cover URL"}
                  type="url"
                  value={cover}
                  onChange={(event) => setCover(event.target.value)}
                  placeholder="https://…"
                />
                <button
                  aria-label={pt ? "Salvar capa" : "Save cover"}
                  onClick={() => save()}
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle className="spin" size={14} />
                  ) : (
                    <Check size={14} />
                  )}
                </button>
              </div>
            )}
            {error && <small role="alert">{error}</small>}
          </div>
        )}
      </div>
      <h3>{game.name}</h3>
      <p>{[game.releaseYear, game.genres[0]].filter(Boolean).join(" · ")}</p>
    </article>
  );
}
