"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import {
  Check,
  ChevronRight,
  Gamepad2,
  Gift,
  Heart,
  LoaderCircle,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { StarRating } from "@/components/library/star-rating";
import {
  statusLabels,
  useGameActions,
  type GameState,
  type GameStatus,
} from "@/lib/game-actions";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Statuses behind the submenu.
 *
 * "Playing" is not here: it is the one status people set constantly and the
 * only one that answers "what am I on right now", so it sits out in the menu
 * body instead of two levels in.
 */
const STATUSES: GameStatus[] = ["COMPLETED", "ON_HOLD", "DROPPED"];

/**
 * The quick-actions menu, everywhere it appears.
 *
 * This is `QuickGameCard`'s menu lifted out whole rather than a second one
 * built to look like it. It first shipped as a rebuilt copy for the home
 * shelf, which is the mistake this replaces: two menus for one set of actions
 * drift the moment either is touched, and a person who learns the menu on a
 * library card should find the same one on a shelf.
 *
 * The card passes `rating` and `onRemove` because it owns those; a shelf
 * cover has room for neither and simply omits them.
 */
export function GameQuickActions({
  lang,
  state,
  pending,
  update,
  rate,
  onRemove,
  removable = false,
  triggerClassName = "quick-more-trigger",
  triggerSize = 16,
  align = "end",
}: {
  lang: UiLang;
  state: GameState;
  pending: string | null;
  update: (
    action: "status" | "playing" | "backlog" | "wishlist" | "liked",
    value: boolean | GameStatus,
  ) => void | Promise<void>;
  /** Omitted where there is no room for a rating row, like a shelf cover. */
  rate?: (value: number | null) => void | Promise<void>;
  onRemove?: () => void;
  removable?: boolean;
  triggerClassName?: string;
  triggerSize?: number;
  align?: "start" | "end";
}) {
  const t = uiText(lang);
  const labels = statusLabels(lang);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={triggerClassName}
          type="button"
          aria-label={t.moreActions}
          disabled={Boolean(pending)}
        >
          {pending && pending !== "status" && pending !== "backlog" ? (
            <LoaderCircle className="spin" size={triggerSize} aria-hidden />
          ) : (
            <MoreHorizontal size={triggerSize} />
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="quick-menu"
          sideOffset={6}
          align={align}
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
                {state?.status !== "BACKLOG" && (
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
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          {rate && (
            <>
              <DropdownMenu.Separator />
              <div className="quick-rating-menu">
                <span>{tri(lang, "Sua nota", "Your rating", "Tu nota")}</span>
                <StarRating
                  value={state?.quick_rating ?? null}
                  onChange={rate}
                  disabled={Boolean(pending)}
                  compact
                  lang={lang}
                />
              </div>
            </>
          )}
          <DropdownMenu.Separator />
          {/* The one status that earns a place out here, and the only control
              for it: the submenu above no longer offers it. */}
          <DropdownMenu.CheckboxItem
            data-action="playing"
            checked={state?.status === "PLAYING"}
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
          <DropdownMenu.Separator />
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
          <DropdownMenu.Separator />
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
          {removable && onRemove && (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                className="quick-menu-remove"
                disabled={Boolean(pending)}
                onSelect={onRemove}
              >
                <Trash2 size={13} />
                {tri(
                  lang,
                  "Remover da biblioteca",
                  "Remove from library",
                  "Quitar de la biblioteca",
                )}
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * The menu plus the state behind it, for surfaces that have no card.
 *
 * `QuickGameCard` owns its own state because it also draws a cover, a title
 * and a rating row from it. A shelf cover has none of that, so this holds the
 * state and hands the same menu the same props.
 */
export function StandaloneGameActions({
  game,
  initial,
  lang,
}: {
  game: { id: number; slug: string };
  initial: GameState;
  lang: UiLang;
}) {
  const { state, pending, update } = useGameActions({
    gameId: game.id,
    gameSlug: game.slug,
    initial,
    lang,
  });
  return (
    <GameQuickActions
      lang={lang}
      state={state}
      pending={pending}
      update={update}
      // No rating row: the trigger sits on a 112px cover and a star row would
      // not fit the menu it opens into on a phone.
      triggerClassName="shelf-actions-trigger"
      triggerSize={15}
    />
  );
}
