"use client";

import { LoaderCircle, Radio } from "lucide-react";
import { useState } from "react";
import { api, settle } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import { announcePlaySession, type OpenSession } from "@/lib/play-session";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * Starts a session on this game, here, with no form in between.
 *
 * The point of a playlog is that it costs one tap to begin: what platform it
 * was on, how long it took and how it went are all things somebody knows
 * afterwards, and asking beforehand is how a session becomes a form nobody
 * opens. Everything after this happens in the bar.
 *
 * One session at a time, so a second press while another game is open says
 * which one that is rather than reporting a constraint.
 */
export function StartPlaySession({
  game,
  lang,
  journeyId = null,
  className = "play-start",
}: {
  game: { id: number; slug: string };
  lang: UiLang;
  journeyId?: string | null;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (pending) return;
    setPending(true);
    setError(null);
    const { data, error: failure } = await settle(
      api.post<{ data: OpenSession }>("/journal/sessions", {
        igdb_id: game.id,
        game_slug: game.slug,
        ...(journeyId ? { journey_id: journeyId } : {}),
      }),
    );
    setPending(false);
    if (data) {
      announcePlaySession(data);
      return;
    }
    setError(
      failure instanceof ApiError && failure.code === "conflict"
        ? tri(
            lang,
            "Você já tem uma sessão aberta. Encerre a dela na barra embaixo.",
            "You already have a session open. Finish it in the bar below.",
            "Ya tienes una sesión abierta. Termínala en la barra de abajo.",
          )
        : tri(
            lang,
            "Não deu para começar agora.",
            "That could not be started right now.",
            "No se pudo empezar ahora.",
          ),
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => void start()}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle size={14} className="spin" aria-hidden />
        ) : (
          <Radio size={14} aria-hidden />
        )}
        <span>
          {tri(lang, "Jogando agora", "Playing now", "Jugando ahora")}
        </span>
      </button>
      {error && <p className="play-start-error">{error}</p>}
    </>
  );
}
