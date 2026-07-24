"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import type { ListPreview } from "@/lib/lists-types";
import { ListPreviewCard } from "./list-preview-card";
import { uiText, type UiLang } from "@/lib/ui-text";

export function LoadMoreLists({
  lang,
  ownerId,
  gridClassName = "lists-row",
  pageSize = 24,
  initialCursor,
  hasMore,
}: {
  lang: UiLang;
  ownerId: string;
  gridClassName?: string;
  pageSize?: number;
  initialCursor: string | null;
  hasMore: boolean;
}) {
  const t = uiText(lang);
  const [extra, setExtra] = useState<ListPreview[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [done, setDone] = useState(!hasMore || !initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
    if (pending || done || !cursor) return;
    setPending(true);
    setError(false);
    const search = new URLSearchParams({
      profile: ownerId,
      before: cursor,
      limit: String(pageSize),
    });
    try {
      const response = await fetch(`/api/lists?${search}`);
      if (!response.ok) throw new Error(String(response.status));
      const { lists } = (await response.json()) as { lists: ListPreview[] };
      if (lists.length < pageSize) setDone(true);
      if (lists.length) {
        setCursor(lists[lists.length - 1].updatedAt);
        setExtra((current) => [...current, ...lists]);
      }
    } catch {
      setError(true);
    }
    setPending(false);
  }

  if (done && !extra.length) return null;
  return (
    <>
      {extra.length > 0 && (
        <div className={gridClassName}>
          {extra.map((list) => (
            <ListPreviewCard
              key={list.id}
              list={{
                id: list.id,
                publicId: list.publicId,
                name: list.name,
                description: list.description,
                visibility: list.visibility,
                ranked: list.ranked,
                kind: list.kind,
                count: list.count,
              }}
              covers={list.covers}
              tierRows={list.tierRows}
              lang={lang}
              likes={list.likes}
            />
          ))}
        </div>
      )}
      {!done && (
        <div className="load-more-row">
          <button type="button" onClick={loadMore} disabled={pending}>
            {pending ? (
              <LoaderCircle className="spin" size={15} aria-hidden />
            ) : (
              <Plus size={15} aria-hidden />
            )}
            {pending ? t.loading : t.loadMore}
          </button>
          {error && <span role="alert">{t.couldNotLoad}</span>}
        </div>
      )}
    </>
  );
}
