"use client";

import { useEffect } from "react";

type RecordViewProps =
  | { type: "game"; gameIgdbId: number; gameSlug: string }
  | { type: "profile"; profileId: string }
  | { type: "list"; listId: string };

/**
 * Fires record_content_view when a signed-in viewer opens a game, profile or
 * list, feeding the view history behind "recently viewed" and the personalised
 * home. Every visit records (and the server upsert bumps viewed_at), so recency
 * stays honest — re-opening something moves it back to the top. Render it only
 * for signed-in viewers; the RPC is a no-op for anyone else. Fire-and-forget so
 * it never blocks the page.
 */
export function RecordView(props: RecordViewProps) {
  const type = props.type;
  const gameIgdbId = props.type === "game" ? props.gameIgdbId : null;
  const gameSlug = props.type === "game" ? props.gameSlug : null;
  const profileId = props.type === "profile" ? props.profileId : null;
  const listId = props.type === "list" ? props.listId : null;
  const ref = String(gameIgdbId ?? profileId ?? listId ?? "");

  useEffect(() => {
    if (!ref) return;
    // A short settle so a quick bounce off the page doesn't count as a view.
    // The effect runs once per mount (stable deps), so a real visit records
    // exactly once and navigating back later records again.
    const timer = window.setTimeout(() => {
      void fetch("/api/history/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          gameIgdbId,
          gameSlug,
          profileId,
          listId,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [type, ref, gameIgdbId, gameSlug, profileId, listId]);

  return null;
}
