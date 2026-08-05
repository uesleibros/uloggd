"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { ActivityStream, type SocialEntry } from "./activity-stream";
import { uiText, type UiLang } from "@/lib/ui-text";

export function LoadMoreActivity({
  lang,
  viewerId,
  profileId,
  gameId,
  feed,
  kind,
  section,
  rating,
  spoilers,
  order,
  query,
  pageSize = 30,
  initialCursor,
  hasMore,
}: {
  lang: UiLang;
  viewerId?: string | null;
  profileId?: string;
  gameId?: number;
  feed?: "following" | "community";
  kind?: "review" | "diary";
  section?: "reviews";
  rating?: "rated" | "great" | "positive" | "mixed" | "low" | "unrated";
  spoilers?: "all" | "hide" | "only";
  order?: "recent" | "oldest";
  query?: string;
  pageSize?: number;
  initialCursor: string | null;
  hasMore: boolean;
}) {
  const t = uiText(lang);
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
    if (feed) search.set("feed", feed);
    if (kind) search.set("kind", kind);
    else if (section) search.set("section", section);
    if (rating) search.set("rating", rating);
    if (spoilers && spoilers !== "all") search.set("spoilers", spoilers);
    if (order && order !== "recent") search.set("order", order);
    if (query) search.set("q", query);
    try {
      const response = await fetch(`/api/activity?${search}`);
      if (!response.ok) throw new Error(String(response.status));
      const { entries } = (await response.json()) as {
        entries: SocialEntry[];
      };
      if (entries.length < pageSize) setDone(true);
      if (entries.length) {
        setCursor(entries[entries.length - 1].createdAt);
        setExtra((current) => [...current, ...entries]);
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
            {pending ? t.loading : t.loadMore}
          </button>
          {error && <span role="alert">{t.couldNotLoad}</span>}
        </div>
      )}
    </>
  );
}
