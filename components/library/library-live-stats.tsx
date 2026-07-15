"use client";

import { useEffect, useMemo, useState } from "react";
import type { LibraryRecord } from "./library-collection";

export function LibraryLiveStats({
  records,
  lang,
}: {
  records: LibraryRecord[];
  lang: "pt-BR" | "en";
}) {
  const [liveRecords, setLiveRecords] = useState(records);
  const pt = lang === "pt-BR";

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
      playing: liveRecords.filter(
        (record) => record.playing || record.status === "PLAYING",
      ).length,
      rated: liveRecords.filter((record) => record.quick_rating !== null)
        .length,
    }),
    [liveRecords],
  );

  return (
    <dl className="library-hero-stats" aria-live="polite">
      <div>
        <dt>{pt ? "Jogos" : "Games"}</dt>
        <dd>{stats.games}</dd>
      </div>
      <div>
        <dt>{pt ? "Jogando" : "Playing"}</dt>
        <dd>{stats.playing}</dd>
      </div>
      <div>
        <dt>{pt ? "Avaliados" : "Rated"}</dt>
        <dd>{stats.rated}</dd>
      </div>
    </dl>
  );
}
