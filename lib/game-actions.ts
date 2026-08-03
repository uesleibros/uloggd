"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, type UiLang } from "@/lib/ui-text";

export type GameStatus =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";

export type GameState = {
  status: GameStatus;
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
  custom_cover_url: string | null;
} | null;

export type GameAction =
  "status" | "playing" | "backlog" | "wishlist" | "liked";

export const GAME_STATE_EVENT = "uloggd:game-state";

export type GameStateEvent = {
  gameId: number;
  state: NonNullable<GameState> | null;
  removed?: boolean;
};

/**
 * Tells every card showing this game that it changed.
 *
 * The same game appears in a shelf, a grid and a search result at once, and
 * refetching each of them would be three requests to learn something the
 * writer already knows.
 */
export function broadcastGameState(
  gameId: number,
  state: NonNullable<GameState> | null,
  removed = false,
) {
  window.dispatchEvent(
    new CustomEvent<GameStateEvent>(GAME_STATE_EVENT, {
      detail: { gameId, state, removed },
    }),
  );
}

/** The six statuses, named the way the interface names them. */
export function statusLabels(lang: UiLang): Record<GameStatus, string> {
  return lang === "pt-BR"
    ? {
        COMPLETED: "Jogado",
        PLAYING: "Jogando",
        ON_HOLD: "Pausado",
        DROPPED: "Abandonado",
        BACKLOG: "Backlog",
        WISHLIST: "Lista de desejos",
      }
    : lang === "es"
      ? {
          COMPLETED: "Jugado",
          PLAYING: "Jugando",
          ON_HOLD: "Pausado",
          DROPPED: "Abandonado",
          BACKLOG: "Backlog",
          WISHLIST: "Lista de deseos",
        }
      : {
          COMPLETED: "Played",
          PLAYING: "Playing",
          ON_HOLD: "Shelved",
          DROPPED: "Abandoned",
          BACKLOG: "Backlog",
          WISHLIST: "Wishlist",
        };
}

/**
 * One game's library state, and the writes that change it.
 *
 * Lifted out of `QuickGameCard` so the same behaviour can appear somewhere
 * that is not that card: the friends shelf on the home page showed what people
 * were playing and gave no way to act on it. The alternative was a second copy
 * of the optimistic update, the rollback, the broadcast and the labels, which
 * is how two surfaces start disagreeing about what "playing" means.
 *
 * Optimistic on purpose: the card flips immediately, reconciles with whatever
 * the RPC returns as canonical, and reverts on failure.
 */
export function useGameActions({
  gameId,
  gameSlug,
  initial,
  lang,
  onStateChange,
}: {
  gameId: number;
  gameSlug: string;
  initial: GameState;
  lang: UiLang;
  onStateChange?: (state: NonNullable<GameState>) => void;
}) {
  const [state, setState] = useState<GameState>(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    function sync(event: Event) {
      const detail = (event as CustomEvent<GameStateEvent>).detail;
      if (detail.gameId !== gameId) return;
      if (detail.removed) setRemoved(true);
      else if (detail.state) setState(detail.state);
    }
    window.addEventListener(GAME_STATE_EVENT, sync);
    return () => window.removeEventListener(GAME_STATE_EVENT, sync);
  }, [gameId]);

  function predict(
    override: Partial<NonNullable<GameState>>,
  ): NonNullable<GameState> {
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

  async function write(
    key: string,
    optimistic: Partial<NonNullable<GameState>>,
    call: () => PromiseLike<{ data: unknown; error: unknown }>,
    failure: string,
  ) {
    if (pending) return;
    const previous = state;
    setState(predict(optimistic));
    setPending(key);
    setError(null);
    const { data, error: actionError } = await call();
    if (actionError) {
      setState(previous);
      setError(failure);
    } else {
      const next = data as NonNullable<GameState>;
      setState(next);
      onStateChange?.(next);
      broadcastGameState(gameId, next);
    }
    setPending(null);
  }

  async function update(action: GameAction, value: boolean | GameStatus) {
    await write(
      action,
      action === "status"
        ? { status: value as GameStatus }
        : ({ [action]: value as boolean } as Partial<NonNullable<GameState>>),
      () =>
        createClient().rpc("set_game_card_action", {
          game_id: gameId,
          game_slug: gameSlug,
          action_name: action,
          action_value: action === "status" ? null : value,
          game_status: action === "status" ? value : null,
        }),
      tri(
        lang,
        "Não foi possível atualizar.",
        "Could not update.",
        "No se pudo actualizar.",
      ),
    );
  }

  async function rate(value: number | null) {
    await write(
      "rating",
      { quick_rating: value },
      () =>
        createClient().rpc("set_game_rating", {
          game_id: gameId,
          game_slug: gameSlug,
          rating: value,
        }),
      tri(
        lang,
        "Não foi possível salvar sua nota.",
        "Could not save your rating.",
        "No se pudo guardar tu nota.",
      ),
    );
  }

  return {
    state,
    setState,
    pending,
    setPending,
    error,
    setError,
    removed,
    setRemoved,
    predict,
    update,
    rate,
  };
}
