"use client";

import { LoaderCircle, Plus } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ConnectionCard, type ConnectionPerson } from "./connection-card";

export function LoadMoreConnections({
  ids,
  lang,
  pageSize = 24,
}: {
  ids: string[];
  lang: "pt-BR" | "en";
  pageSize?: number;
}) {
  const pt = lang === "pt-BR";
  const [extra, setExtra] = useState<ConnectionPerson[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const done = loaded >= ids.length;

  async function loadMore() {
    if (pending || done) return;
    setPending(true);
    setError(false);
    const chunk = ids.slice(loaded, loaded + pageSize);
    const { data, error: actionError } = await createClient()
      .from("profiles")
      .select("id,username,display_name,bio,avatar_url,verified")
      .in("id", chunk);
    if (actionError) setError(true);
    else {
      setExtra((current) => [
        ...current,
        ...((data ?? []) as ConnectionPerson[]),
      ]);
      setLoaded((current) => current + chunk.length);
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
