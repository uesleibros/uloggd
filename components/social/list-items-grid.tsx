"use client";

import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Game } from "@/lib/igdb";
import { createClient } from "@/lib/supabase/client";
import { QuickGameCard } from "../library/quick-game-card";
import { ListItemTools } from "./list-item-tools";
import { RemoveListItem } from "./list-owner-controls";
import { tri, type UiLang } from "@/lib/ui-text";

export type ListGridItem = {
  id: string;
  igdbId: number;
  note: string | null;
};

/**
 * `ranked` decides the item chrome: only a ranking paints the numbered badge.
 * Dragging is for any owner, because both formats store a position and both
 * already expose the same reorder through the up/down tools — withholding the
 * handle from collections just made the tools the only way to do it.
 */
export function ListItemsGrid({
  listId,
  items,
  games,
  isOwner,
  ranked,
  lang,
}: {
  listId: string;
  items: ListGridItem[];
  games: Record<number, Game>;
  isOwner: boolean;
  ranked: boolean;
  lang: UiLang;
}) {
  const pt = lang === "pt-BR";
  const router = useRouter();
  const [localItems, setLocalItems] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setLocalItems(items);
  }
  const [drag, setDrag] = useState<{
    index: number;
    insertIndex: number;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  function slotFromPoint(clientX: number, clientY: number) {
    const target = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-item-index]");
    if (!target) return null;
    const index = Number(target.dataset.itemIndex);
    if (!Number.isInteger(index)) return null;
    const rect = target.getBoundingClientRect();
    const after = clientX - rect.left > rect.width / 2;
    return index + (after ? 1 : 0);
  }

  async function drop(fromIndex: number, insertIndex: number) {
    const finalIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
    if (finalIndex === fromIndex) return;
    const next = [...localItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(finalIndex, 0, moved);
    setLocalItems(next);
    setPending(true);
    const { error } = await createClient().rpc("place_list_item", {
      target_list: listId,
      item_id: moved.id,
      new_position: finalIndex,
    });
    if (error) setLocalItems(localItems);
    router.refresh();
    setPending(false);
  }

  const dragEnabled = isOwner;
  return (
    <div
      ref={gridRef}
      className="library-grid list-items-grid"
      data-mode={ranked ? "ranked" : "collection"}
      data-reordering={drag ? "" : undefined}
      onPointerMove={(event) => {
        if (!drag) return;
        const slot = slotFromPoint(event.clientX, event.clientY);
        if (slot !== null && slot !== drag.insertIndex)
          setDrag({ index: drag.index, insertIndex: slot });
      }}
      onPointerUp={() => {
        if (!drag) return;
        const { index, insertIndex } = drag;
        setDrag(null);
        void drop(index, insertIndex);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {localItems.map((item, index) => {
        const game = games[item.igdbId];
        if (!game) return null;
        const isDragged = drag?.index === index;
        const showBefore = drag && !isDragged && drag.insertIndex === index;
        const showAfter = drag && !isDragged && drag.insertIndex === index + 1;
        return (
          <div
            className="ranked-list-item"
            key={item.id}
            data-item-index={index}
            data-dragged={isDragged || undefined}
            data-drop-before={showBefore || undefined}
            data-drop-after={showAfter || undefined}
            style={{ "--item-index": index % 12 } as React.CSSProperties}
          >
            {ranked && (
              // Only the podium carries a medal; past third the badge stays
              // neutral so the top three keep their meaning.
              <span data-rank={index < 3 ? index + 1 : undefined}>
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
            {dragEnabled && (
              <button
                type="button"
                className="list-item-drag-handle"
                data-motion="none"
                aria-label={
                  pt
                    ? `Arrastar ${game.name} para reordenar`
                    : `Drag ${game.name} to reorder`
                }
                onPointerDown={(event) => {
                  event.preventDefault();
                  gridRef.current?.setPointerCapture(event.pointerId);
                  setDrag({ index, insertIndex: index });
                }}
              >
                <GripVertical size={14} />
              </button>
            )}
            <QuickGameCard
              game={game}
              initial={null}
              lang={lang}
              enabled={false}
            />
            {item.note && <p>{item.note}</p>}
            {isOwner && (
              <div className="list-item-owner-tools">
                <ListItemTools
                  listId={listId}
                  itemId={item.id}
                  note={item.note}
                  first={index === 0}
                  last={index === localItems.length - 1}
                  lang={lang}
                />
                <RemoveListItem
                  listId={listId}
                  gameId={item.igdbId}
                  lang={lang}
                />
              </div>
            )}
          </div>
        );
      })}
      {pending && (
        <span className="sr-only">
          {tri(lang, "Salvando ordem", "Saving order", "Guardando el orden")}
        </span>
      )}
    </div>
  );
}
