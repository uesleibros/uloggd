"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Check,
  Clock3,
  Gamepad2,
  Gift,
  Heart,
  LoaderCircle,
  MoreHorizontal,
  X,
} from "lucide-react";
import {
  statusLabels,
  useGameActions,
  type GameState,
  type GameStatus,
} from "@/lib/game-actions";
import { uiText, type UiLang } from "@/lib/ui-text";

/** Behind the submenu; "playing" sits outside it, where it is used. */
const STATUSES: GameStatus[] = ["COMPLETED", "ON_HOLD", "DROPPED"];

/**
 * The quick actions, without the card around them.
 *
 * `QuickGameCard` owns a large card with a cover, a title and a rating row,
 * and none of that fits a shelf whose whole point is a cover and a name. This
 * is the menu on its own, over the same shared state, so a game acted on here
 * updates every other card showing it without a refetch.
 */
export function GameQuickActions({
  game,
  initial,
  lang,
  enabled = true,
}: {
  game: { id: number; slug: string };
  initial: GameState;
  lang: UiLang;
  enabled?: boolean;
}) {
  const t = uiText(lang);
  const labels = statusLabels(lang);
  const { state, pending, update } = useGameActions({
    gameId: game.id,
    gameSlug: game.slug,
    initial,
    lang,
  });

  if (!enabled) return null;
  const playing = state?.status === "PLAYING";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="shelf-actions-trigger"
          type="button"
          aria-label={t.moreActions}
          disabled={Boolean(pending)}
        >
          {pending ? (
            <LoaderCircle className="spin" size={15} aria-hidden />
          ) : (
            <MoreHorizontal size={15} />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="quick-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          <DropdownMenu.CheckboxItem
            data-action="playing"
            checked={playing}
            onCheckedChange={(value) =>
              void update("status", value === true ? "PLAYING" : "BACKLOG")
            }
          >
            <Gamepad2 size={13} />
            {labels.PLAYING}
            <DropdownMenu.ItemIndicator>
              <Check size={13} />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            data-action="backlog"
            checked={state?.backlog ?? false}
            onCheckedChange={(value) => void update("backlog", value === true)}
          >
            <Clock3 size={13} />
            Backlog
            <DropdownMenu.ItemIndicator>
              <Check size={13} />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            data-action="wishlist"
            checked={state?.wishlist ?? false}
            onCheckedChange={(value) => void update("wishlist", value === true)}
          >
            <Gift size={13} />
            {t.wishlist}
            <DropdownMenu.ItemIndicator>
              <Check size={13} />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            data-action="liked"
            checked={state?.liked ?? false}
            data-liked={state?.liked || undefined}
            onCheckedChange={(value) => void update("liked", value === true)}
          >
            <Heart size={13} fill={state?.liked ? "currentColor" : "none"} />
            {t.like}
            <DropdownMenu.ItemIndicator>
              <Check size={13} />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.CheckboxItem>

          <DropdownMenu.Separator />
          {STATUSES.map((status) => (
            <DropdownMenu.Item
              key={status}
              onSelect={() => void update("status", status)}
            >
              <span
                className={`quick-status-dot status-${status.toLowerCase()}`}
              />
              {labels[status]}
              {state?.status === status && <Check size={13} />}
            </DropdownMenu.Item>
          ))}
          {state && state.status !== "BACKLOG" && (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                className="quick-menu-clear"
                onSelect={() => void update("status", "BACKLOG")}
              >
                <X size={13} />
                {t.clearStatus}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
