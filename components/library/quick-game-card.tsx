"use client";

import { motion, useReducedMotion } from "motion/react";
import { EASE_OUT, MOTION_MS, SPRING } from "@/lib/motion";
import Link from "next/link";
import { Check, Clock3, Gift, Heart, LoaderCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveGameCover } from "@/lib/game-cover";
import { Tooltip } from "@/components/ui/tooltip";
import { SpawndLogo } from "../spawnd-logo";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  broadcastGameState,
  GAME_STATE_EVENT,
  type GameStateEvent,
} from "@/lib/game-actions";
import { GameQuickActions } from "./game-quick-actions";

type Status =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

type State = {
  status: Status;
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
} | null;

export function QuickGameCard({
  game,
  initial,
  lang,
  rank,
  enabled = true,
  meta,
  removable = false,
  onRemove,
  onStateChange,
  spawndAvailable = false,
  hrefSuffix = "",
}: {
  game: {
    id: number;
    slug: string;
    name: string;
    coverUrl: string;
    releaseYear: number | null;
    genres: string[];
    publishers?: string[];
    developers?: string[];
  };
  initial: State;
  lang: UiLang;
  rank?: number;
  enabled?: boolean;
  meta?: string;
  removable?: boolean;
  onRemove?: () => void;
  onStateChange?: (state: NonNullable<State>) => void;
  spawndAvailable?: boolean;
  hrefSuffix?: string;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [state, setState] = useState<State>(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<GameStateEvent>).detail;
      if (detail.gameId !== game.id) return;
      if (detail.removed) setRemoved(true);
      else if (detail.state) setState(detail.state);
    }
    window.addEventListener(GAME_STATE_EVENT, sync);
    return () => window.removeEventListener(GAME_STATE_EVENT, sync);
  }, [game.id]);

  const labels: Record<Status, string> = pt
    ? {
        COMPLETED: "Jogado",
        PLAYING: "Jogando",
        ON_HOLD: "Pausado",
        DROPPED: "Abandonado",
        BACKLOG: "Backlog",
        WISHLIST: "Lista de desejos",
      }
    : {
        COMPLETED: "Played",
        PLAYING: "Playing",
        ON_HOLD: "Shelved",
        DROPPED: "Abandoned",
        BACKLOG: "Backlog",
        WISHLIST: "Wishlist",
      };

  // Optimistic: flip the card immediately, reconcile with the canonical
  // state from the RPC (broadcast only that), and revert on error.
  function predict(override: Partial<NonNullable<State>>): NonNullable<State> {
    return {
      status: "BACKLOG",
      playing: false,
      backlog: false,
      wishlist: false,
      liked: false,
      quick_rating: null,
      custom_cover_url: null,
      ...(state ?? {}),
      ...override,
    };
  }

  async function update(
    action: "status" | "playing" | "backlog" | "wishlist" | "liked",
    value: boolean | Status,
  ) {
    if (pending) return;
    const previous = state;
    setState(
      predict(
        action === "status"
          ? { status: value as Status }
          : { [action]: value as boolean },
      ),
    );
    setPending(action);
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "set_game_card_action",
      {
        game_id: game.id,
        game_slug: game.slug,
        action_name: action,
        action_value: action === "status" ? null : value,
        game_status: action === "status" ? value : null,
      },
    );
    if (actionError) {
      setState(previous);
      setError(
        tri(
          lang,
          "Não foi possível atualizar.",
          "Could not update.",
          "No se pudo actualizar.",
        ),
      );
    } else {
      const next = data as NonNullable<State>;
      setState(next);
      onStateChange?.(next);
      broadcastGameState(game.id, next);
    }
    setPending(null);
  }

  async function rate(value: number | null) {
    if (pending) return;
    const previous = state;
    setState(predict({ quick_rating: value }));
    setPending("rating");
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "set_game_rating",
      { game_id: game.id, game_slug: game.slug, rating: value },
    );
    if (actionError) {
      setState(previous);
      setError(
        tri(
          lang,
          "Não foi possível salvar sua nota.",
          "Could not save your rating.",
          "No se pudo guardar tu nota.",
        ),
      );
    } else {
      const next = data as NonNullable<State>;
      setState(next);
      onStateChange?.(next);
      broadcastGameState(game.id, next);
    }
    setPending(null);
  }

  async function remove() {
    if (pending) return;
    setPending("remove");
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "remove_game_from_library",
      { game_id: game.id },
    );
    if (actionError || data !== true) {
      setError(
        tri(
          lang,
          "Não foi possível remover este jogo.",
          "Could not remove this game.",
          "No se pudo quitar este juego.",
        ),
      );
      setPending(null);
      return;
    }
    setRemoving(true);
    window.setTimeout(() => {
      setRemoved(true);
      onRemove?.();
      broadcastGameState(game.id, null, true);
    }, 180);
  }

  // Above the `removed` early return: hooks have to run in the same order on
  // every render, and this one sat below it.
  const still = useReducedMotion();
  const played = state?.status === "COMPLETED";
  const image = resolveGameCover(game.coverUrl, state?.custom_cover_url);

  if (removed) return null;

  return (
    // The existing element becomes the animated one rather than being wrapped:
    // this card is a grid item on the library page and a wrapper would take
    // that role, changing how every cell is sized. `layout` is what makes the
    // cards that stay slide when one is filtered out or removed instead of
    // jumping to their new cells.
    <motion.article
      className="quick-game-card"
      data-removing={removing || undefined}
      style={{ viewTransitionName: `library-game-${game.id}` }}
      layout={still ? false : "position"}
      initial={still ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={still ? undefined : { opacity: 0, scale: 0.97 }}
      transition={
        still
          ? { duration: 0 }
          : {
              ...SPRING,
              opacity: { duration: MOTION_MS.quick / 1000, ease: EASE_OUT },
            }
      }
    >
      <div className="quick-cover">
        {/* Custom cover selection belongs to the game page; cards only display it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={`${t.coverOf} ${game.name}`}
          onError={(event) => {
            if (event.currentTarget.src !== game.coverUrl)
              event.currentTarget.src = game.coverUrl;
          }}
        />
        <Link
          className="quick-game-link"
          href={`/${lang}/game/${game.slug}${hrefSuffix}`}
          aria-label={`${t.open} ${game.name}`}
        />
        {rank && (
          <span className="quick-rank">{String(rank).padStart(2, "0")}</span>
        )}
        {spawndAvailable && (
          <span
            className="quick-spawnd-badge"
            aria-label={tri(
              lang,
              "Jogável no spawnd",
              "Playable on spawnd",
              "Jugable en spawnd",
            )}
          >
            <SpawndLogo compact />
            {tri(lang, "Jogável", "Playable", "Jugable")}
          </span>
        )}
        {enabled &&
          state &&
          (state.wishlist || state.backlog || state.liked) && (
            <div
              className="quick-card-flags"
              aria-label={tri(
                lang,
                "Listas salvas",
                "Saved lists",
                "Listas guardadas",
              )}
            >
              {state.wishlist && (
                <Tooltip label={labels.WISHLIST}>
                  <span data-action="wishlist" aria-label={labels.WISHLIST}>
                    <Gift size={11} />
                  </span>
                </Tooltip>
              )}
              {state.backlog && (
                <Tooltip label="Backlog">
                  <span data-action="backlog" aria-label="Backlog">
                    <Clock3 size={11} />
                  </span>
                </Tooltip>
              )}
              {state.liked && (
                <Tooltip label={t.favorite}>
                  <span data-action="liked" aria-label={t.favorite}>
                    <Heart size={11} fill="currentColor" />
                  </span>
                </Tooltip>
              )}
            </div>
          )}
        <div className="quick-card-details">
          <strong>{game.name}</strong>
          {state?.quick_rating ? (
            <span>
              <Star size={11} fill="currentColor" />
              {state.quick_rating / 20}/5
            </span>
          ) : null}
        </div>
        {enabled && (
          <div className="quick-action-bar">
            <Tooltip label={labels.COMPLETED}>
              <button
                type="button"
                data-action="completed"
                data-active={played || undefined}
                aria-pressed={played}
                aria-label={labels.COMPLETED}
                disabled={Boolean(pending)}
                onClick={() =>
                  update("status", played ? "BACKLOG" : "COMPLETED")
                }
              >
                {pending === "status" ? (
                  <LoaderCircle className="spin" size={16} aria-hidden />
                ) : (
                  <Check size={16} />
                )}
              </button>
            </Tooltip>
            <Tooltip label="Backlog">
              <button
                type="button"
                data-action="backlog"
                data-active={state?.backlog || undefined}
                aria-pressed={state?.backlog ?? false}
                aria-label="Backlog"
                disabled={Boolean(pending)}
                onClick={() => update("backlog", !state?.backlog)}
              >
                {pending === "backlog" ? (
                  <LoaderCircle className="spin" size={15} aria-hidden />
                ) : (
                  <Clock3 size={15} />
                )}
              </button>
            </Tooltip>
            {/* The shared menu, not a copy: the shelf on the home page uses
                the same component, so the actions cannot drift apart. */}
            <GameQuickActions
              lang={lang}
              state={state}
              pending={pending}
              update={update}
              rate={rate}
              removable={removable}
              onRemove={remove}
            />
          </div>
        )}
        {error && (
          <span className="quick-card-error" role="alert">
            {error}
          </span>
        )}
      </div>
      <h3>{game.name}</h3>
      <p className="quick-card-meta">
        <span>
          {meta ??
            [
              game.releaseYear,
              game.publishers?.[0] ?? game.developers?.[0] ?? game.genres[0],
            ]
              .filter(Boolean)
              .join(" · ")}
        </span>
        {state?.quick_rating ? (
          <strong>
            <Star size={10} fill="currentColor" /> {state.quick_rating / 20}/5
          </strong>
        ) : null}
      </p>
    </motion.article>
  );
}
