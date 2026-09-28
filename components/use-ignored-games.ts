"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { ToggleSync } from "@/lib/toggle-sync";

/**
 * The games this reader has set aside, as something a button can press.
 *
 * One of these per view, shared by both places a series is drawn, because two
 * implementations of "press now, reconcile later" is two sets of races to get
 * right. The queue itself is `lib/toggle-sync`, which is pure and tested; this
 * is the React around it: local state for what to draw, with an optional
 * resync once the network has gone quiet for views that need it.
 *
 * The server's list is where it starts and stops being the authority the
 * moment somebody presses: a page rendered before the press lands afterwards,
 * and adopting it would bounce the mark back for a moment and then forward
 * again.
 */
export function useIgnoredGames(
  initial: number[],
  { refreshOnSettled = true }: { refreshOnSettled?: boolean } = {},
) {
  const router = useRouter();
  const [ignored, setIgnored] = useState<ReadonlySet<number>>(
    () => new Set(initial),
  );
  const [inFlight, setInFlight] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [failed, setFailed] = useState(false);

  // What is on screen, for the press that starts a new entry: the queue seeds
  // itself with what the server is believed to hold, and believing the
  // opposite would send the wrong verb. Kept in step after each commit rather
  // than during the render, which is both the rule and the truth: a press can
  // only happen once something has been painted.
  const showing = useRef<ReadonlySet<number>>(ignored);
  useEffect(() => {
    showing.current = ignored;
  }, [ignored]);
  const slugs = useRef(new Map<number, string>());

  const marking = useCallback((id: number, busy: boolean) => {
    setInFlight((before) => {
      if (before.has(id) === busy) return before;
      const next = new Set(before);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const sync = useRef<ToggleSync | null>(null);
  if (sync.current == null)
    sync.current = new ToggleSync({
      write: async (id, desired) => {
        marking(id, true);
        try {
          if (desired)
            await api.post("/library/ignored", {
              igdb_id: id,
              game_slug: slugs.current.get(id) ?? "",
            });
          else await api.delete(`/library/ignored/${id}`);
        } finally {
          marking(id, false);
        }
      },
      onVisible: (id, visible) =>
        setIgnored((before) => {
          const next = new Set(before);
          if (visible) next.add(id);
          else next.delete(id);
          return next;
        }),
      onError: () => setFailed(true),
      // Views that read this list elsewhere can resync after the queue settles.
      // The library series already updates all of its own values locally.
      onSettled: refreshOnSettled ? () => router.refresh() : undefined,
    });

  // A snapshot from the server is adopted only where nothing is pending and
  // it agrees with what the last write returned, so a page rendered before a
  // press cannot undo it.
  const fromServer = initial.join(",");
  useEffect(() => {
    const queue = sync.current;
    if (!queue) return;
    const snapshot = new Set(
      fromServer ? fromServer.split(",").map(Number) : [],
    );
    setIgnored((before) => {
      const next = new Set(before);
      let changed = false;
      for (const id of new Set([...before, ...snapshot])) {
        const held = snapshot.has(id);
        if (!queue.adopt(id, held)) continue;
        if (held !== next.has(id)) {
          if (held) next.add(id);
          else next.delete(id);
          changed = true;
        }
      }
      return changed ? next : before;
    });
  }, [fromServer]);

  const toggle = useCallback((id: number, slug: string) => {
    const queue = sync.current;
    if (!queue) return;
    slugs.current.set(id, slug);
    setFailed(false);
    queue.press(id, showing.current.has(id));
  }, []);

  return {
    ignored,
    toggle,
    pending: (id: number) => inFlight.has(id),
    failed,
  };
}
