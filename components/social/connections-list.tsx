"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ShallowLink, shallowNavigate } from "@/components/shallow-link";
import { SearchSubmit } from "@/components/search-submit";
import { ConnectionCard } from "@/components/social/connection-card";
import { LoadMoreConnections } from "@/components/social/load-more-connections";
import { LoadError } from "@/components/ui/load-error";
import type { ConnectionRow } from "@/lib/connections";
import { useApi } from "@/lib/use-api";
import { useProfileLevels } from "@/lib/use-profile-levels";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

const PAGE_SIZE = 24;

/**
 * Followers and following, with the search over them.
 *
 * Each tab and each search was a page from the server, which read the profile,
 * its counts and the people again to show the other half of the same list. The
 * page draws the header and the counts once now, and this reads the tab and the
 * search from the address and asks for the people alone, keeping the last list
 * on screen, dimmed, while the next arrives.
 */
export function ConnectionsList({
  username,
  lang,
  viewerId,
  followers,
  following,
}: {
  username: string;
  lang: UiLang;
  viewerId: string | null;
  followers: number;
  following: number;
}) {
  const t = uiText(lang);
  const params = useSearchParams();
  const tab = params?.get("tab") === "following" ? "following" : "followers";
  const query = (params?.get("q") ?? "").trim();
  const [draft, setDraft] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);
  if (seenQuery !== query) {
    setSeenQuery(query);
    setDraft(query);
  }

  // Searches filter on the server and are capped at 60; the plain list is
  // paged by date with "load more".
  const request = new URLSearchParams({
    tab,
    limit: String(query ? 60 : PAGE_SIZE),
    ...(query ? { q: query } : {}),
  });
  const path = `/profiles/${encodeURIComponent(username)}/connections?${request}`;
  const answer = useApi<{ data: ConnectionRow[] }>(path, {
    keepPrevious: true,
  });
  const rows = answer.payload?.data ?? null;
  const people = useMemo(() => (rows ?? []).map((row) => row.person), [rows]);
  const levels = useProfileLevels(
    useMemo(() => people.map((person) => person.id), [people]),
  );

  const base = `/${lang}/u/${username}/connections`;
  const hrefFor = (next: "followers" | "following") =>
    `${base}?tab=${next}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <>
      <nav
        className="game-page-nav game-page-nav-counted"
        aria-label={tri(
          lang,
          "Filtrar conexões",
          "Filter connections",
          "Filtrar conexiones",
        )}
      >
        <ShallowLink
          href={hrefFor("followers")}
          aria-current={tab === "followers" ? "page" : undefined}
        >
          {t.followers} <span>{followers}</span>
        </ShallowLink>
        <ShallowLink
          href={hrefFor("following")}
          aria-current={tab === "following" ? "page" : undefined}
        >
          {t.following} <span>{following}</span>
        </ShallowLink>
      </nav>
      <form
        className="profile-connections-search"
        onSubmit={(event) => {
          event.preventDefault();
          const term = draft.trim();
          shallowNavigate(
            `${base}?tab=${tab}${term ? `&q=${encodeURIComponent(term)}` : ""}`,
          );
        }}
      >
        <label className="search-field-hit">
          <Search size={16} />
          <input
            type="search"
            name="q"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tri(
              lang,
              "Buscar por nome ou @usuário",
              "Search name or @user",
              "Buscar por nombre o @usuario",
            )}
            aria-label={tri(
              lang,
              "Buscar conexões",
              "Search connections",
              "Buscar conexiones",
            )}
          />
        </label>
        <SearchSubmit lang={lang} />
      </form>
      {rows === null ? (
        answer.error && !answer.loading ? (
          <LoadError
            lang={lang}
            onRetry={answer.reload}
            what={tri(lang, "as conexões", "the connections", "las conexiones")}
          />
        ) : (
          <div
            className="profile-connections-grid"
            aria-busy="true"
            aria-hidden
          >
            {Array.from({ length: 8 }, (_, index) => (
              <span className="skeleton-block" key={index} />
            ))}
          </div>
        )
      ) : people.length ? (
        <div className="pending-region" data-stale={answer.stale || undefined}>
          <div className="profile-connections-grid">
            {people.map((person) => (
              <ConnectionCard
                key={person.id}
                person={person}
                lang={lang}
                standing={levels.get(person.id)}
                viewerId={viewerId}
              />
            ))}
          </div>
          {!answer.stale && (
            <LoadMoreConnections
              // Another tab or search is another list.
              key={path}
              username={username}
              tab={tab}
              lang={lang}
              pageSize={PAGE_SIZE}
              initialCursor={
                rows.length ? rows[rows.length - 1].created_at : null
              }
              hasMore={!query && rows.length === PAGE_SIZE}
              viewerId={viewerId}
            />
          )}
        </div>
      ) : (
        <div className="social-empty profile-subpage-empty">
          <span aria-hidden>
            <UserRound size={22} />
          </span>
          <h2>
            {query
              ? tri(
                  lang,
                  "Nenhuma conexão encontrada",
                  "No connections found",
                  "No se encontraron conexiones",
                )
              : tri(
                  lang,
                  "Ninguém por aqui ainda",
                  "No one here yet",
                  "Todavía no hay nadie por aquí",
                )}
          </h2>
          <p>
            {tri(
              lang,
              "Esta parte da rede ainda está vazia.",
              "This part of the network is still empty.",
              "Esta parte de la red todavía está vacía.",
            )}
          </p>
        </div>
      )}
    </>
  );
}
