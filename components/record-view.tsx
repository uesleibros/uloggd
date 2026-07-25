"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// One record per item per page session — re-renders and revisits within the
// same load don't re-hit the RPC. The server upsert already dedups across
// loads; this just avoids needless round-trips.
const recorded = new Set<string>();

type RecordViewProps =
  | { type: "game"; gameIgdbId: number; gameSlug: string }
  | { type: "profile"; profileId: string }
  | { type: "list"; listId: string };

/**
 * Fires record_content_view once when a signed-in viewer opens a game, profile
 * or list, feeding the view history behind "recently viewed" and the
 * personalised home. Render it only for signed-in viewers; the RPC is a no-op
 * for anyone else. Fully fire-and-forget so it never blocks the page.
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
    const key = `${type}:${ref}`;
    if (recorded.has(key)) return;
    recorded.add(key);

    // A brief settle so a quick bounce off the page doesn't count as a view.
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      void createClient()
        .rpc("record_content_view", {
          p_type: type,
          p_game_igdb_id: gameIgdbId,
          p_game_slug: gameSlug,
          p_profile_id: profileId,
          p_list_id: listId,
        })
        .then(({ error }) => {
          if (error) recorded.delete(key);
        });
    }, 800);

    return () => {
      window.clearTimeout(timer);
      // Left before it settled — let a later visit record it.
      if (!fired) recorded.delete(key);
    };
  }, [type, ref, gameIgdbId, gameSlug, profileId, listId]);

  return null;
}
