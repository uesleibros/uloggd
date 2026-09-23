"use client";

import { BookOpen, Layers3, Map as MapIcon, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ShallowLink } from "@/components/shallow-link";
import {
  ActivityStream,
  type SocialEntry,
} from "@/components/social/activity-stream";
import { LoadMoreActivity } from "@/components/social/load-more-activity";
import { ReviewGameArchive } from "@/components/social/review-game-archive";
import {
  ReviewWorkspaceControls,
  type ReviewWorkspaceState,
} from "@/components/social/review-workspace-controls";
import { ArchiveStreamSkeleton } from "@/components/social/workspace-body-skeletons";
import { LoadError } from "@/components/ui/load-error";
import { useApi } from "@/lib/use-api";
import type { ActivityOptions } from "@/lib/activity-types";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

type ActivityRating = NonNullable<ActivityOptions["rating"]>;
type ActivitySpoilers = NonNullable<ActivityOptions["spoilers"]>;

// Each value was checked against these sets before it reaches a cast below.
const RATINGS = new Set([
  "all",
  "rated",
  "great",
  "positive",
  "mixed",
  "low",
  "unrated",
]);
const SPOILERS = new Set(["all", "hide", "only"]);
const ORDERS = new Set(["recent", "oldest", "rating"]);

/** The filters in the address, with the same rules the server page had. */
function readState(params: URLSearchParams | null): ReviewWorkspaceState {
  const get = (key: string) => params?.get(key) ?? undefined;
  const type = get("type");
  const scope: ReviewWorkspaceState["scope"] =
    type === "review"
      ? "review"
      : type === "journey" || type === "diary"
        ? "journey"
        : "all";
  const requestedGame = get("game") ?? "all";
  const rating = get("rating") ?? "all";
  const spoilers = get("spoilers") ?? "all";
  const order = get("order") ?? "recent";
  return {
    scope,
    game: /^[1-9]\d{0,8}$/.test(requestedGame) ? requestedGame : "all",
    rating: scope === "journey" ? "all" : RATINGS.has(rating) ? rating : "all",
    spoilers: SPOILERS.has(spoilers) ? spoilers : "all",
    order:
      ORDERS.has(order) && (order !== "rating" || scope === "review")
        ? order
        : "recent",
    view: get("view") === "games" ? "games" : "timeline",
    query: (get("q") ?? "").trim().slice(0, 80),
  };
}

/**
 * The owner's archive of reviews and journeys, below its hero.
 *
 * Every tab, filter and order was a new page from the server: it read the
 * entries, the archive's summary and every game's name and cover from IGDB
 * again, although the summary and the names do not change with the filters.
 * The page draws those once now, and this reads the filters from the address
 * and asks for the entries alone, keeping the last answer on screen, dimmed,
 * while the next arrives.
 */
export function OwnerReviewArchive({
  lang,
  userId,
  username,
  reviewCount,
  sessionCount,
  games,
}: {
  lang: UiLang;
  userId: string;
  username: string;
  reviewCount: number;
  sessionCount: number;
  games: Array<{ id: number; name: string }>;
}) {
  const t = uiText(lang);
  const state = readState(useSearchParams());
  const { scope, game, rating, spoilers, order, view, query } = state;
  const entryLimit = view === "games" || order === "rating" ? 180 : 60;
  const kinds =
    scope === "review"
      ? "review"
      : scope === "journey"
        ? "diary"
        : rating === "all"
          ? "review,diary"
          : "review";
  const request = new URLSearchParams({
    profile: userId,
    limit: String(entryLimit),
    kinds,
    spoilers,
    order,
  });
  if (game !== "all") request.set("game", game);
  if (scope !== "journey" && rating !== "all") request.set("rating", rating);
  if (query) request.set("q", query);
  const path = `/activity?${request}`;
  const answer = useApi<{ data: SocialEntry[] }>(path, { keepPrevious: true });
  const entries = answer.payload?.data ?? null;

  function scopeHref(value: ReviewWorkspaceState["scope"]) {
    const next = new URLSearchParams();
    if (value !== "all") next.set("type", value);
    if (game !== "all") next.set("game", game);
    if (value !== "journey" && rating !== "all") next.set("rating", rating);
    if (spoilers !== "all") next.set("spoilers", spoilers);
    if (order !== "recent" && !(order === "rating" && value !== "review"))
      next.set("order", order);
    if (view === "games") next.set("view", "games");
    if (query) next.set("q", query);
    const search = next.toString();
    return `/${lang}/reviews/${username}${search ? `?${search}` : ""}`;
  }

  const visibleCount = entries
    ? entries.length === entryLimit
      ? `${entries.length}+`
      : String(entries.length)
    : null;
  const canLoadMore = view === "timeline" && order !== "rating";

  return (
    <>
      <nav
        className="game-page-nav reviews-scope-tabs"
        aria-label={tri(
          lang,
          "Filtrar arquivo",
          "Filter archive",
          "Filtrar archivo",
        )}
      >
        {[
          {
            value: "all" as const,
            label: tri(lang, "Tudo", "All", "Todo"),
            icon: <Layers3 size={14} />,
            count: reviewCount + sessionCount,
          },
          {
            value: "review" as const,
            label: t.reviews,
            icon: <Star size={14} />,
            count: reviewCount,
          },
          {
            value: "journey" as const,
            label: tri(lang, "Jornadas", "Journeys", "Recorridos"),
            icon: <MapIcon size={14} />,
            count: sessionCount,
          },
        ].map(({ value, label, icon, count }) => (
          <ShallowLink
            key={value}
            href={scopeHref(value)}
            aria-current={scope === value ? "page" : undefined}
          >
            {icon}
            {label}
            <b>{count}</b>
          </ShallowLink>
        ))}
      </nav>

      <ReviewWorkspaceControls
        key={query}
        lang={lang}
        state={state}
        games={games}
      />

      <header className="reviews-results-heading">
        <div>
          <span>
            {view === "games"
              ? tri(
                  lang,
                  "ARQUIVO POR JOGO",
                  "ARCHIVE BY GAME",
                  "ARCHIVO POR JUEGO",
                )
              : tri(lang, "LINHA DO TEMPO", "TIMELINE", "CRONOLOGÍA")}
          </span>
          <h2>
            {visibleCount === null
              ? tri(lang, "Buscando...", "Searching...", "Buscando...")
              : tri(
                  lang,
                  `${visibleCount} ${entries!.length === 1 ? "registro encontrado" : "registros encontrados"}`,
                  `${visibleCount} ${entries!.length === 1 ? "entry found" : "entries found"}`,
                  `${visibleCount} ${entries!.length === 1 ? "registro encontrado" : "registros encontrados"}`,
                )}
          </h2>
        </div>
        <p>
          {tri(
            lang,
            "Avaliações abrem a leitura completa; jornadas abrem todas as sessões vinculadas.",
            "Reviews open the full read; journeys open every linked session.",
            "Las reseñas abren la lectura completa; los recorridos abren todas sus sesiones.",
          )}
        </p>
      </header>

      {entries === null ? (
        answer.error && !answer.loading ? (
          <LoadError
            lang={lang}
            onRetry={answer.reload}
            what={tri(lang, "o seu arquivo", "your archive", "tu archivo")}
          />
        ) : (
          <ArchiveStreamSkeleton />
        )
      ) : (
        <div className="pending-region" data-stale={answer.stale || undefined}>
          {entries.length === 0 ? (
            <section className="reviews-filter-empty">
              <span aria-hidden>
                <BookOpen size={20} />
              </span>
              <h2>
                {tri(
                  lang,
                  "Nenhum registro encontrado",
                  "No entries found",
                  "No se encontraron registros",
                )}
              </h2>
              <p>
                {tri(
                  lang,
                  "Ajuste os filtros ou limpe a busca para voltar ao seu arquivo completo.",
                  "Adjust the filters or clear the search to return to your complete archive.",
                  "Ajusta los filtros o limpia la búsqueda para volver a tu archivo completo.",
                )}
              </p>
            </section>
          ) : view === "games" ? (
            <ReviewGameArchive
              entries={entries}
              lang={lang}
              viewerId={userId}
            />
          ) : (
            <ActivityStream entries={entries} lang={lang} viewerId={userId} />
          )}
          {canLoadMore && !answer.stale && (
            <LoadMoreActivity
              // A new filter is a new list; what was loaded under the last one
              // does not belong under this one.
              key={path}
              lang={lang}
              viewerId={userId}
              profileId={userId}
              section="reviews"
              kind={
                scope === "journey"
                  ? "diary"
                  : scope === "review" || rating !== "all"
                    ? "review"
                    : undefined
              }
              gameId={game === "all" ? undefined : Number(game)}
              rating={
                scope === "journey" || rating === "all"
                  ? undefined
                  : (rating as ActivityRating)
              }
              spoilers={spoilers as ActivitySpoilers}
              order={order === "oldest" ? "oldest" : "recent"}
              query={query || undefined}
              initialCursor={
                entries.length ? entries[entries.length - 1].createdAt : null
              }
              hasMore={entries.length === entryLimit}
              pageSize={60}
            />
          )}
        </div>
      )}
    </>
  );
}
