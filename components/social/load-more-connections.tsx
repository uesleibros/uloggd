"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getConnectionsPage, type ConnectionTab } from "@/lib/connections";
import { ConnectionCard, type ConnectionPerson } from "./connection-card";

export function LoadMoreConnections({
  profileId,
  tab,
  lang,
  pageSize = 24,
  initialCursor,
  hasMore,
}: {
  profileId: string;
  tab: ConnectionTab;
  lang: "pt-BR" | "en";
  pageSize?: number;
  initialCursor: string | null;
  hasMore: boolean;
}) {
  const pt = lang === "pt-BR";
  const [extra, setExtra] = useState<ConnectionPerson[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [done, setDone] = useState(!hasMore || !initialCursor);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function loadMore() {
    if (pending || done || !cursor) return;
    setPending(true);
    setError(false);
    try {
      const rows = await getConnectionsPage(createClient(), {
        profileId,
        tab,
        before: cursor,
        limit: pageSize,
      });
      if (rows.length < pageSize) setDone(true);
      if (rows.length) {
        setCursor(rows[rows.length - 1].created_at);
        setExtra((current) => [...current, ...rows.map((row) => row.person)]);
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
        <div className="profile-connections-grid">
          {extra.map((person) => (
            <ConnectionCard key={person.id} person={person} lang={lang} />
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
