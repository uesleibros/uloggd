"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronDown,
  Clock3,
  Gift,
  Heart,
  LoaderCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StarRating } from "./star-rating";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type Status =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
type State = {
  status: Status;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
  quick_rating: number | null;
} | null;
const statusOptions: Status[] = ["COMPLETED", "PLAYING", "ON_HOLD", "DROPPED"];

export function GameActionPanel({
  game,
  initial,
  lang,
  enabled,
}: {
  game: { id: number; slug: string };
  initial: State;
  lang: UiLang;
  enabled: boolean;
}) {
  const pt = lang === "pt-BR";
  const t = uiText(lang);
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Optimistic: flip the UI immediately, reconcile with the canonical state
  // from the RPC, and revert on error.
  function predict(override: Partial<NonNullable<State>>): NonNullable<State> {
    return {
      status: "BACKLOG",
      backlog: false,
      wishlist: false,
      liked: false,
      quick_rating: null,
      ...(state ?? {}),
      ...override,
    };
  }

  async function update(
    action: "status" | "backlog" | "wishlist" | "liked",
    value: boolean | Status,
  ) {
    if (!enabled || pending) return;
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
          "Não foi possível atualizar sua biblioteca.",
          "Could not update your library.",
          "No se pudo actualizar tu biblioteca.",
        ),
      );
    } else setState(data as State);
    setPending(null);
  }

  async function rate(value: number | null) {
    if (!enabled || pending) return;
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
          "Não foi possível salvar sua avaliação. Tente novamente.",
          "Could not save your rating. Please try again.",
          "No se pudo guardar tu valoración. Inténtalo de nuevo.",
        ),
      );
    } else setState(data as State);
    setPending(null);
  }

  if (!enabled)
    return (
      <p className="game-actions-signed-out">
        {tri(
          lang,
          "Entre para acompanhar este jogo.",
          "Sign in to track this game.",
          "Inicia sesión para seguir este juego.",
        )}
      </p>
    );

  const actions = [
    { key: "backlog" as const, label: "Backlog", icon: Clock3 },
    {
      key: "wishlist" as const,
      label: t.wishlist,
      icon: Gift,
    },
    { key: "liked" as const, label: t.like, icon: Heart },
  ];

  return (
    <div className="game-action-panel">
      <div className="game-user-rating">
        <span>{tri(lang, "SUA NOTA", "YOUR RATING", "TU NOTA")}</span>
        <StarRating
          value={state?.quick_rating ?? null}
          onChange={rate}
          disabled={Boolean(pending)}
          lang={lang}
        />
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="game-status-button"
            type="button"
            disabled={Boolean(pending)}
          >
            {pending === "status" ? (
              <LoaderCircle className="spin" size={14} aria-hidden />
            ) : (
              <span
                className={`quick-status-dot status-${state?.status?.toLowerCase()}`}
              />
            )}
            {state && state.status !== "BACKLOG"
              ? labels[state.status]
              : tri(lang, "Definir status", "Set status", "Definir estado")}
            <ChevronDown size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="quick-menu"
            sideOffset={6}
            align="start"
            collisionPadding={12}
          >
            {statusOptions.map((status) => (
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
                  {t.clearStatus}
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {actions.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          data-action={key}
          data-active={state?.[key] || undefined}
          data-liked={(key === "liked" && state?.liked) || undefined}
          aria-pressed={state?.[key] ?? false}
          disabled={Boolean(pending)}
          onClick={() => update(key, !state?.[key])}
        >
          {pending === key ? (
            <LoaderCircle className="spin" size={14} aria-hidden />
          ) : (
            <Icon
              size={14}
              fill={key === "liked" && state?.liked ? "currentColor" : "none"}
            />
          )}
          {label}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
