"use client";

import { useEffect, useMemo, useState } from "react";
import { Gamepad2, Play, Star } from "lucide-react";
import type { LibraryRecord } from "./library-collection";
import { uiText, type UiLang } from "@/lib/ui-text";

export function LibraryLiveStats({
  records,
  lang,
}: {
  records: LibraryRecord[];
  lang: UiLang;
}) {
  const [liveRecords, setLiveRecords] = useState(records);
  const t = uiText(lang);

  useEffect(() => {
    function sync(event: Event) {
      const detail = (
        event as CustomEvent<{
          gameId: number;
          state: Partial<LibraryRecord> | null;
          removed?: boolean;
        }>
      ).detail;
      setLiveRecords((current) =>
        detail.removed
          ? current.filter((record) => record.igdb_id !== detail.gameId)
          : current.map((record) =>
              record.igdb_id === detail.gameId && detail.state
                ? { ...record, ...detail.state }
                : record,
            ),
      );
    }
    window.addEventListener("uloggd:game-state", sync);
    return () => window.removeEventListener("uloggd:game-state", sync);
  }, []);

  const stats = useMemo(
    () => ({
      games: liveRecords.length,
      playing: liveRecords.filter((record) => record.status === "PLAYING")
        .length,
      rated: liveRecords.filter((record) => record.quick_rating !== null)
        .length,
    }),
    [liveRecords],
  );

  return (
    <dl className="workspace-hero-stats library-hero-stats" aria-live="polite">
      <div>
        <dt>
          <Gamepad2 size={14} /> {t.games}
        </dt>
        <dd>{stats.games}</dd>
      </div>
      <div>
        <dt>
          <Play size={14} /> {t.playing}
        </dt>
        <dd>{stats.playing}</dd>
      </div>
      <div>
        <dt>
          <Star size={14} /> {t.rated}
        </dt>
        <dd>{stats.rated}</dd>
      </div>
    </dl>
  );
}
