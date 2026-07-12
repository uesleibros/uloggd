"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Clock3,
  Gift,
  Heart,
  MoreHorizontal,
  Play,
  Star,
} from "lucide-react";
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
}) {
  const pt = lang === "pt-BR";
  const [state, setState] = useState<State>(initial);
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
      setError(pt ? "Não foi possível atualizar." : "Could not update.");
    } else {
      setState(data as State);
    }
    setPending(null);
  }

  const played = state?.status === "COMPLETED";
  const image = state?.custom_cover_url || game.coverUrl;

  return (
    <article className="quick-game-card">
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
        <div className="quick-card-details">
          <strong>{game.name}</strong>
          {state?.quick_rating ? (
            <span>
              <Star size={11} fill="currentColor" />
              {state.quick_rating}
            </span>
          ) : null}
        </div>
        {enabled && (
          <div className="quick-action-bar">
            <button
              type="button"
              data-active={played || undefined}
              aria-label={labels.COMPLETED}
              title={labels.COMPLETED}
              disabled={Boolean(pending)}
              onClick={() => update("status", played ? "BACKLOG" : "COMPLETED")}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              data-active={state?.backlog || undefined}
              aria-label="Backlog"
              title="Backlog"
              disabled={Boolean(pending)}
              onClick={() => update("backlog", !state?.backlog)}
            >
              <Clock3 size={15} />
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="quick-more-trigger"
                  type="button"
                  aria-label={pt ? "Mais ações" : "More actions"}
                  disabled={Boolean(pending)}
                >
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="quick-menu"
                  sideOffset={6}
                  align="end"
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
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                  <DropdownMenu.Separator />
                  <DropdownMenu.CheckboxItem
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
      <p>
        {meta ?? [game.releaseYear, game.genres[0]].filter(Boolean).join(" · ")}
      </p>
    </article>
  );
}
