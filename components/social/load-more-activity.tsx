"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { ActivityStream, type SocialEntry } from "./activity-stream";

export function LoadMoreActivity({
  lang,
  viewerId,
  profileId,
  gameId,
  kind,
  pageSize = 30,
  initialCursor,
  hasMore,
}: {
  lang: "pt-BR" | "en";
  viewerId?: string | null;
  profileId?: string;
  gameId?: number;
  kind?: "review" | "diary";
  pageSize?: number;
  initialCursor: string | null;
  hasMore: boolean;
}) {
  const pt = lang === "pt-BR";
  const [extra, setExtra] = useState<SocialEntry[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [done, setDone] = useState(!hasMore || !initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
    if (pending || done || !cursor) return;
    setPending(true);
    setError(false);
    const search = new URLSearchParams({
      before: cursor,
      limit: String(pageSize),
    });
    if (profileId) search.set("profile", profileId);
    if (gameId) search.set("game", String(gameId));
    try {
      const response = await fetch(`/api/activity?${search}`);
      if (!response.ok) throw new Error(String(response.status));
      const { entries } = (await response.json()) as {
        entries: SocialEntry[];
      };
      if (entries.length < pageSize) setDone(true);
      if (entries.length) {
        setCursor(entries[entries.length - 1].createdAt);
        const visible = kind
          ? entries.filter((entry) => entry.kind === kind)
          : entries;
        if (visible.length) setExtra((current) => [...current, ...visible]);
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
        <ActivityStream entries={extra} lang={lang} viewerId={viewerId} />
      )}
      {!done && (
        <div className="load-more-row">
          <button type="button" onClick={loadMore} disabled={pending}>
            {pending ? (
              <LoaderCircle className="spin" size={15} aria-hidden />
            ) : (
              <Plus size={15} aria-hidden />
            )}
            {pending
              ? pt
                ? "Carregando…"
                : "Loading…"
              : pt
                ? "Carregar mais"
                : "Load more"}
          </button>
          {error && (
            <span role="alert">
              {pt ? "Não foi possível carregar." : "Could not load."}
            </span>
          )}
        </div>
      )}
    </>
  );
}
