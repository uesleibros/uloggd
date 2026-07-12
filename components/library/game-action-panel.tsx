"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Clock3, Gift, Heart, Play } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status =
  "WISHLIST" | "BACKLOG" | "PLAYING" | "COMPLETED" | "DROPPED" | "ON_HOLD";
type State = {
  status: Status;
  playing: boolean;
  backlog: boolean;
  wishlist: boolean;
  liked: boolean;
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
  lang: "pt-BR" | "en";
  enabled: boolean;
}) {
  const pt = lang === "pt-BR";
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

  async function update(
    action: "status" | "playing" | "backlog" | "wishlist" | "liked",
    value: boolean | Status,
  ) {
    if (!enabled || pending) return;
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
    if (actionError)
      setError(
        pt
          ? "Não foi possível atualizar sua biblioteca."
          : "Could not update your library.",
      );
    else setState(data as State);
    setPending(null);
  }

  if (!enabled)
    return (
      <p className="game-actions-signed-out">
        {pt
          ? "Entre para acompanhar este jogo."
          : "Sign in to track this game."}
      </p>
    );

  const actions = [
    { key: "playing" as const, label: pt ? "Jogando" : "Playing", icon: Play },
    { key: "backlog" as const, label: "Backlog", icon: Clock3 },
    {
      key: "wishlist" as const,
      label: pt ? "Lista de desejos" : "Wishlist",
      icon: Gift,
    },
    { key: "liked" as const, label: pt ? "Curtir" : "Like", icon: Heart },
  ];

  return (
    <div className="game-action-panel">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="game-status-button"
            type="button"
            disabled={Boolean(pending)}
          >
            <span
              className={`quick-status-dot status-${state?.status?.toLowerCase()}`}
            />
            {state && state.status !== "BACKLOG"
              ? labels[state.status]
              : pt
                ? "Definir status"
                : "Set status"}
            <ChevronDown size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="quick-menu"
            sideOffset={6}
            align="start"
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
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {actions.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          data-active={state?.[key] || undefined}
          data-liked={(key === "liked" && state?.liked) || undefined}
          disabled={Boolean(pending)}
          onClick={() => update(key, !state?.[key])}
        >
          <Icon
            size={14}
            fill={
              key === "playing" || (key === "liked" && state?.liked)
                ? "currentColor"
                : "none"
            }
          />
          {label}
        </button>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
