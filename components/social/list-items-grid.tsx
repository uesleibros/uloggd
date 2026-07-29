"use client";

import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
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
type QuickGameInitial = ComponentProps<typeof QuickGameCard>["initial"];

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
  viewerEnabled,
  initialById,
}: {
  listId: string;
  items: ListGridItem[];
  games: Record<number, Game>;
  isOwner: boolean;
  ranked: boolean;
  lang: UiLang;
  viewerEnabled: boolean;
  initialById: Record<number, QuickGameInitial>;
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
  const dragRef = useRef<typeof drag>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

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

  function headerBottom() {
    const header = document.querySelector<HTMLElement>(".content-header");
    return header ? header.getBoundingClientRect().bottom : 0;
  }

  function applyPointerPosition(x: number, y: number) {
    const current = dragRef.current;
    if (!current) return;
    const slot = slotFromPoint(x, Math.max(y, headerBottom() + 6));
    if (slot !== null && slot !== current.insertIndex) {
      const next = { index: current.index, insertIndex: slot };
      dragRef.current = next;
      setDrag(next);
    }
  }

  function autoScroll() {
    if (!dragRef.current) {
      rafRef.current = 0;
      return;
    }
    const { x, y } = pointerRef.current;
    const edge = 150;
    const maxSpeed = 46;
    const topLine = headerBottom() + edge;
    let delta = 0;
    if (y < topLine) {
      const distance = Math.min(1, (topLine - y) / edge);
      delta = -Math.ceil(distance * distance * maxSpeed);
    } else if (y > window.innerHeight - edge) {
      const distance = Math.min(1, (y - (window.innerHeight - edge)) / edge);
      delta = Math.ceil(distance * distance * maxSpeed);
    }
    if (delta) {
      window.scrollBy(0, delta);
      applyPointerPosition(x, y);
    }
    rafRef.current = requestAnimationFrame(autoScroll);
  }

  function trackPointer(x: number, y: number) {
    pointerRef.current = { x, y };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(autoScroll);
  }

  function stopDragging() {
    dragRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setDrag(null);
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
        trackPointer(event.clientX, event.clientY);
        applyPointerPosition(event.clientX, event.clientY);
      }}
      onPointerUp={() => {
        if (!drag) return;
        const { index, insertIndex } = drag;
        stopDragging();
        void drop(index, insertIndex);
      }}
      onPointerCancel={stopDragging}
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
                  const next = { index, insertIndex: index };
                  dragRef.current = next;
                  setDrag(next);
                  trackPointer(event.clientX, event.clientY);
                }}
              >
                <GripVertical size={14} />
              </button>
            )}
            <QuickGameCard
              game={game}
              initial={initialById[item.igdbId] ?? null}
              lang={lang}
              enabled={viewerEnabled}
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
