"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Clock3,
  Gift,
  Heart,
  LoaderCircle,
  MoreHorizontal,
  Play,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveGameCover } from "@/lib/game-cover";
import { StarRating } from "./star-rating";
import { SpawndLogo } from "../spawnd-logo";

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

const statuses: Status[] = ["COMPLETED", "PLAYING", "ON_HOLD", "DROPPED"];

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
  meta?: string;
  removable?: boolean;
  onRemove?: () => void;
  onStateChange?: (state: NonNullable<State>) => void;
  spawndAvailable?: boolean;
}) {
  const pt = lang === "pt-BR";
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

  async function update(
    action: "status" | "playing" | "backlog" | "wishlist" | "liked",
    value: boolean | Status,
  ) {
    if (pending) return;
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
      const message = pt ? "Não foi possível atualizar." : "Could not update.";
      setError(message);
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
    setPending("rating");
    setError(null);
    const { data, error: actionError } = await createClient().rpc(
      "set_game_rating",
      { game_id: game.id, game_slug: game.slug, rating: value },
    );
    if (actionError) {
      const message = pt
        ? "Não foi possível salvar sua nota."
        : "Could not save your rating.";
      setError(message);
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
        pt
          ? "Não foi possível remover este jogo."
          : "Could not remove this game.",
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

  const played = state?.status === "COMPLETED";
  const image = resolveGameCover(game.coverUrl, state?.custom_cover_url);

  if (removed) return null;

  return (
    <article
      className="quick-game-card"
      data-removing={removing || undefined}
      style={{ viewTransitionName: `library-game-${game.id}` }}
    >
      <div className="quick-cover">
        {/* Custom cover selection belongs to the game page; cards only display it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={`${pt ? "Capa de" : "Cover of"} ${game.name}`} />
        <Link
          className="quick-game-link"
          href={`/${lang}/game/${game.slug}`}
          aria-label={`${pt ? "Abrir" : "Open"} ${game.name}`}
        />
        {rank && (
          <span className="quick-rank">{String(rank).padStart(2, "0")}</span>
        )}
        {spawndAvailable && (
          <span
            className="quick-spawnd-badge"
            title={pt ? "Jogável no spawnd" : "Playable on spawnd"}
          >
            <SpawndLogo compact />
            {pt ? "Jogável" : "Playable"}
          </span>
        )}
        {enabled &&
          state &&
          (state.wishlist || state.backlog || state.liked) && (
            <div
              className="quick-card-flags"
              aria-label={pt ? "Listas salvas" : "Saved lists"}
            >
              {state.wishlist && (
                <span data-action="wishlist" title={labels.WISHLIST}>
                  <Gift size={11} />
                </span>
              )}
              {state.backlog && (
                <span data-action="backlog" title="Backlog">
                  <Clock3 size={11} />
                </span>
              )}
              {state.liked && (
                <span data-action="liked" title={pt ? "Favorito" : "Favorite"}>
                  <Heart size={11} fill="currentColor" />
                </span>
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
            <button
              type="button"
              data-action="completed"
              data-active={played || undefined}
              aria-pressed={played}
              aria-label={labels.COMPLETED}
              title={labels.COMPLETED}
              disabled={Boolean(pending)}
              onClick={() => update("status", played ? "BACKLOG" : "COMPLETED")}
            >
              {pending === "status" ? (
                <LoaderCircle className="spin" size={16} aria-hidden />
              ) : (
                <Check size={16} />
              )}
            </button>
            <button
              type="button"
              data-action="backlog"
              data-active={state?.backlog || undefined}
              aria-pressed={state?.backlog ?? false}
              aria-label="Backlog"
              title="Backlog"
              disabled={Boolean(pending)}
              onClick={() => update("backlog", !state?.backlog)}
            >
              {pending === "backlog" ? (
                <LoaderCircle className="spin" size={15} aria-hidden />
              ) : (
                <Clock3 size={15} />
              )}
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="quick-more-trigger"
                  type="button"
                  aria-label={pt ? "Mais ações" : "More actions"}
                  disabled={Boolean(pending)}
                >
                  {pending && pending !== "status" && pending !== "backlog" ? (
                    <LoaderCircle className="spin" size={16} aria-hidden />
                  ) : (
                    <MoreHorizontal size={16} />
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="quick-menu"
                  sideOffset={6}
                  align="end"
                  collisionPadding={12}
                >
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger>
                      <span
                        className={`quick-status-dot status-${state?.status?.toLowerCase()}`}
                      />
                      {state && state.status !== "BACKLOG"
                        ? labels[state.status]
                        : "Status"}
                      <ChevronRight size={13} />
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent
                        className="quick-menu"
                        sideOffset={4}
                        collisionPadding={12}
                      >
                        {statuses.map((status) => (
                          <DropdownMenu.Item
                            key={status}
                            onSelect={() => update("status", status)}
                          >
                            <span
                              className={`quick-status-dot status-${status.toLowerCase()}`}
                            />
                            {labels[status]}
                            {state?.status === status && <Check size={13} />}
                          </DropdownMenu.Item>
                        ))}
                        {state?.status !== "BACKLOG" && (
                          <>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              className="quick-menu-clear"
                              onSelect={() => update("status", "BACKLOG")}
                            >
                              <X size={13} />
                              {pt ? "Limpar status" : "Clear status"}
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Separator />
                  <div className="quick-rating-menu">
                    <span>{pt ? "Sua nota" : "Your rating"}</span>
                    <StarRating
                      value={state?.quick_rating ?? null}
                      onChange={rate}
                      disabled={Boolean(pending)}
                      compact
                      lang={lang}
                    />
                  </div>
                  <DropdownMenu.Separator />
                  <DropdownMenu.CheckboxItem
                    data-action="playing"
                    checked={state?.playing ?? false}
                    onCheckedChange={(value) =>
                      update("playing", value === true)
                    }
                  >
                    <Play size={13} fill="currentColor" />
                    {pt ? "Jogando" : "Playing"}
                    <DropdownMenu.ItemIndicator>
                      <Check size={13} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.CheckboxItem
                    data-action="wishlist"
                    checked={state?.wishlist ?? false}
                    onCheckedChange={(value) =>
                      update("wishlist", value === true)
                    }
                  >
                    <Gift size={13} />
                    {pt ? "Lista de desejos" : "Wishlist"}
                    <DropdownMenu.ItemIndicator>
                      <Check size={13} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                  <DropdownMenu.Separator />
                  <DropdownMenu.CheckboxItem
                    data-action="liked"
                    checked={state?.liked ?? false}
                    data-liked={state?.liked || undefined}
                    onCheckedChange={(value) => update("liked", value === true)}
                  >
                    <Heart
                      size={13}
                      fill={state?.liked ? "currentColor" : "none"}
                    />
                    {pt ? "Curtir" : "Like"}
                    <DropdownMenu.ItemIndicator>
                      <Check size={13} />
                    </DropdownMenu.ItemIndicator>
                  </DropdownMenu.CheckboxItem>
                  {removable && (
                    <>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        className="quick-menu-remove"
                        disabled={Boolean(pending)}
                        onSelect={remove}
                      >
                        <Trash2 size={13} />
                        {pt ? "Remover da biblioteca" : "Remove from library"}
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
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
            [game.releaseYear, game.genres[0]].filter(Boolean).join(" · ")}
        </span>
        {state?.quick_rating ? (
          <strong>
            <Star size={10} fill="currentColor" /> {state.quick_rating / 20}/5
          </strong>
        ) : null}
      </p>
    </article>
  );
}

const GAME_STATE_EVENT = "uloggd:game-state";
type GameStateEvent = {
  gameId: number;
  state: NonNullable<State> | null;
  removed?: boolean;
};

function broadcastGameState(
  gameId: number,
  state: NonNullable<State> | null,
  removed = false,
) {
  window.dispatchEvent(
    new CustomEvent<GameStateEvent>(GAME_STATE_EVENT, {
      detail: { gameId, state, removed },
    }),
  );
}
