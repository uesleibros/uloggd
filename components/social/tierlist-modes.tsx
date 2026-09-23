"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useListEditing } from "@/components/social/list-mode";
import {
  TierlistBoard,
  TierlistSkeleton,
} from "@/components/social/tierlist-board";
import { TierlistEditor } from "@/components/social/tierlist-editor";
import type { TierlistResponse } from "@/lib/content-types";

type TierlistData = TierlistResponse["data"];
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A tierlist, as a board or, for its owner, as the editor.
 *
 * The switch between them was a link the server answered by drawing the page
 * again, the tiers and every cover included, although the board on screen
 * already held all of it. The switch is a change of address now (see
 * useListEditing), and this answers it with what it has:
 *
 * - the editor also needs the games that are not on the board yet (the pool),
 *   so opening it asks for the tiers with the pool, and shows the board's
 *   skeleton only until that arrives;
 * - going back shows the board again at once, dimmed, while it is asked for
 *   afresh, so whatever was saved in the editor is what it ends up showing.
 *
 * Each visit to either side asks again, rather than reusing an answer from
 * before the last edit.
 */
export function TierlistModes({
  listId,
  initial,
  initialHasPool,
  isOwner,
  lang,
}: {
  listId: string;
  /** What the server drew the page with. */
  initial: TierlistData;
  /** Whether that already carries the pool, because the page opened editing. */
  initialHasPool: boolean;
  isOwner: boolean;
  lang: UiLang;
}) {
  const editRequested = useListEditing();
  const editing = isOwner && editRequested;
  const [seen, setSeen] = useState(editing);
  const [visits, setVisits] = useState({ edit: 0, view: 0 });
  if (seen !== editing) {
    setSeen(editing);
    setVisits((current) =>
      editing
        ? { ...current, edit: current.edit + 1 }
        : { ...current, view: current.view + 1 },
    );
  }

  // The API reads `pool` and nothing else; `visit` only makes each visit a
  // question of its own.
  const usesInitialEditor = visits.edit === 0 && initialHasPool;
  const editor = useApi<TierlistResponse>(
    editing && !usesInitialEditor
      ? `/lists/${listId}/tiers?pool=1&visit=${visits.edit}`
      : null,
  );
  const board = useApi<TierlistResponse>(
    !editing && visits.view > 0
      ? `/lists/${listId}/tiers?pool=0&visit=${visits.view}`
      : null,
    { keepPrevious: true },
  );

  if (editing) {
    const data = usesInitialEditor ? initial : editor.payload?.data;
    if (!data) return <TierlistSkeleton />;
    return (
      <TierlistEditor
        key={visits.edit}
        listId={listId}
        initial={data}
        lang={lang}
      />
    );
  }

  const data = board.payload?.data ?? initial;
  const refreshing = visits.view > 0 && (board.loading || board.stale);
  if (!data.items.length && !refreshing)
    return (
      <div className="social-empty">
        <span aria-hidden>
          <LayoutGrid size={22} />
        </span>
        <h2>
          {tri(lang, "Tierlist vazia", "Empty tierlist", "Tierlist vacía")}
        </h2>
        <p>
          {tri(
            lang,
            "Nenhum jogo classificado ainda.",
            "No games ranked yet.",
            "Ningún juego clasificado todavía.",
          )}
        </p>
      </div>
    );
  return (
    <div data-stale={refreshing || undefined}>
      <TierlistBoard
        tiers={data.tiers}
        items={data.items}
        lang={lang}
        linkGames
      />
    </div>
  );
}
